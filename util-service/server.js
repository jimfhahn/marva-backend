const express = require('express');
const shell = require('shelljs')
const cors = require('cors')
const rp = require('request-promise');
const fs = require('fs');
const { auth } = require('express-openid-connect');
const zip = require('zip-a-folder');
const simpleGit = require('simple-git')();
const shellJs = require('shelljs');
const crypto = require('crypto');


const mongo = require('mongodb')
const MongoClient = mongo.MongoClient;

var recsStageByEid = {}
var recsProdByEid = {}


var recsStageByUser = {}
var recsProdByUser = {}

const MLUSER = '';
const MLPASS = '';
const MLUSERSTAGE = '';
const MLPASSSTAGE = '';
const STAGINGPOSTURL = 'https://api-na.hosted.exlibrisgroup.com/almaws/v1/bibs?from_nz_mms_id=&from_cz_mms_id=&normalization=&validate=false&override_warning=true&check_match=false&apikey=yourapikeyhere';
const PRODUCTIONPOSTURL = '';


let postLog = []

let editorVersion = {'major':0,'minor':0,'patch':0}

try{
	editorVersion = JSON.parse(fs.readFileSync('ver_prod.json', 'utf8'));
}catch{
	console.error("Missing ver_prod.json")	
}


let editorVersionStage = {'major':0,'minor':0,'patch':0}

try{
	editorVersionStage = JSON.parse(fs.readFileSync('ver_stage.json', 'utf8'));
}catch{
	console.error("Missing ver_stage.json")	
}



// if (process.env.EDITORVERSION){
// 	let v = process.env.EDITORVERSION.split('.')
// 	editorVersion.major = parseInt(v[0])
// 	editorVersion.minor = parseInt(v[1])
// 	editorVersion.patch = parseInt(v[2])
// }


let now = parseInt(new Date() / 1000)
let ageLimitForAllRecords = 15 //days


const uri = 'mongodb://mongo:27017/';
MongoClient.connect(uri, function(err, client) {

    const db = client.db('ldp');


    // build an intial index
    // db.collection('resourcesStaging').find({}, {}, 0, 1, function (err, docs) {
    //     if(err){
    //         throw err;
    //     }
    //     console.log(col);
    //     docs.forEach(console.log);
    // });



    var cursor = db.collection('resources').find({});

 		cursor.forEach((doc)=>{


 			if (doc.index){
 				
 				if ((now - doc.index.timestamp) / 60 / 60 / 24 <= ageLimitForAllRecords){

	 				if (doc.index.eid){
	 					recsStageByEid[doc.index.eid] = doc.index
	 					recsStageByEid[doc.index.eid]._id = doc._id
	 				}
	 				if (doc.index.user && doc.index.eid){
	 					if (!recsStageByUser[doc.index.user]){
	 						recsStageByUser[doc.index.user] = {}
	 					}
	 					recsStageByUser[doc.index.user][doc.index.eid] = doc.index
	 					recsStageByUser[doc.index.user][doc.index.eid]._id = doc._id
	 				}
	 			}
 			}
 		})


    db.collection('resources').watch().on('change', data => 
    {

        // get the doc
				db.collection('resources').findOne({'_id':new mongo.ObjectID(data.documentKey['_id'])})
				.then(function(doc) {
        if(!doc)
            throw new Error('No record found.');

			      // add it to the list or update it whatever
		 				if (doc.index.eid){
		 					recsStageByEid[doc.index.eid] = doc.index
		 					recsStageByEid[doc.index.eid]._id = doc._id
		 				}

			      if (doc.index.user && doc.index.eid){
		 					if (!recsStageByUser[doc.index.user]){
		 						recsStageByUser[doc.index.user] = {}
		 					}
		 					recsStageByUser[doc.index.user][doc.index.eid] = doc.index
		 					recsStageByUser[doc.index.user][doc.index.eid]._id = doc._id
			      }




			  });


    });




    var cursor = db.collection('resources').find({});

 		cursor.forEach((doc)=>{

 			if (doc.index){

 				if ((now - doc.index.timestamp) / 60 / 60 / 24 <= ageLimitForAllRecords){

	 				if (doc.index.eid){
	 					recsProdByEid[doc.index.eid] = doc.index
	 					recsProdByEid[doc.index.eid]._id = doc._id
	 				}
	 				if (doc.index.user && doc.index.eid){
	 					if (!recsProdByUser[doc.index.user]){
	 						recsProdByUser[doc.index.user] = {}
	 					}
	 					recsProdByUser[doc.index.user][doc.index.eid] = doc.index				
	 					recsProdByUser[doc.index.user][doc.index.eid]._id = doc._id			
	 				}
	 			}
 			}
 		})


    db.collection('resources').watch().on('change', data => 
    {

        // get the doc
				db.collection('resources').findOne({'_id':new mongo.ObjectID(data.documentKey['_id'])})
				.then(function(doc) {
        if(!doc)
            throw new Error('No record found.');

			      // add it to the list or update it whatever
		 				if (doc.index.eid){
		 					recsProdByEid[doc.index.eid] = doc.index
		 					recsProdByEid[doc.index.eid]._id = doc._id
		 				}

			      if (doc.index.user && doc.index.eid){
		 					if (!recsProdByUser[doc.index.user]){
		 						recsProdByUser[doc.index.user] = {}
		 					}
		 					recsProdByUser[doc.index.user][doc.index.eid] = doc.index
		 					recsProdByUser[doc.index.user][doc.index.eid]._id = doc._id
			      }




			  });


    });





});




 

var app = express();

app.set('view engine', 'ejs');

app.use(express.json({limit: '15mb'}));

app.use(cors({origin:true}))

app.options('*', cors())


// app.get('/', function(request, response){
//   console.log(request.body);      // your JSON
//    response.send(request.body);    // echo the result back
// });

app.get('/', function(request, response) {


	let correctlogin
	if (request.headers.authorization){
		correctlogin = Buffer.from(`${process.env.DEPLOYPW.replace(/"/g,'')}:${process.env.DEPLOYPW.replace(/"/g,'')}`).toString('base64')
	}
	if (  request.headers.authorization !== `Basic ${correctlogin}`){
		return response.set('WWW-Authenticate','Basic').status(401).send('Authentication required.') // Access denied.   
	}


	// load the local deploy options
	let config = JSON.parse(fs.readFileSync('util_config.json', 'utf8'));


	// Access granted...
	response.render('index', { editorVersionStage: editorVersionStage, editorVersion:editorVersion, config: config });
  
});



app.get('/version/editor', function(request, response){
  response.json(editorVersion);
});

app.get('/version/editor/stage', function(request, response){
  response.json(editorVersionStage);
});

app.get('/version/set/:env/:major/:minor/:patch', function(request, response){

	let correctlogin = 'yeet'
	
	if (request.headers.authorization){
		correctlogin = Buffer.from(`${process.env.DEPLOYPW.replace(/"/g,'')}:${process.env.DEPLOYPW.replace(/"/g,'')}`).toString('base64')
	}
	if (  request.headers.authorization !== `Basic ${correctlogin}`){
		return response.set('WWW-Authenticate','Basic').status(401).send('Authentication required.') // Access denied.   
	}


	let ver = {"major":parseInt(request.params.major),"minor":parseInt(request.params.minor),"patch":parseInt(request.params.patch)}

	if (request.params.env == 'staging'){
		fs.writeFileSync( 'ver_stage.json' , JSON.stringify(ver))
		editorVersionStage = ver
	}else{
		fs.writeFileSync( 'ver_prod.json' , JSON.stringify(ver))
		editorVersion = ver
	}



	response.json({});
});




app.get('/reports/stats/:year/:quarter', function(request, response){



	let correctlogin = 'yeet'
	if (request.headers.authorization){
		correctlogin = Buffer.from(`${process.env.STATSPW.replace(/"/g,'')}:${process.env.STATSPW.replace(/"/g,'')}`).toString('base64')
	}
	if (  request.headers.authorization !== `Basic ${correctlogin}`){
		return response.set('WWW-Authenticate','Basic').status(401).send('Authentication required.') // Access denied.   
	}

	var chunk = function(arr, chunkSize) {
	  if (chunkSize <= 0) throw "Invalid chunk size";
	  var R = [];
	  for (var i=0,len=arr.length; i<len; i+=chunkSize)
	    R.push(arr.slice(i,i+chunkSize));
	  return R;
	}

	var isNumeric = function(num){
	  return !isNaN(num)
	}

	var getDaysArray = function(start, end) {
	    for(var arr=[],dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
	        arr.push(new Date(dt));
	    }
	    return arr;
	};


	if (request.params.quarter){
		request.params.quarter = request.params.quarter.toUpperCase()
	}


	let qlookup = {'Q1': ['-10-01','-12-31'],
	'Q2': ['-01-01','-03-31'],
	'Q3': ['-04-01','-06-30'],
	'Q4': ['-07-01','-09-30']}



	if (!isNumeric(request.params.year) || request.params.year.length < 4){
		response.send('Year does not look like  a year')
		return false
	}

	if (!qlookup[request.params.quarter]){
		response.send('Year does not look like  a valid quarter')
		return false
	}


	let start_date = request.params.year + qlookup[request.params.quarter][0]
	let end_date = request.params.year + qlookup[request.params.quarter][1]


	let start_time = new Date(start_date).getTime() / 1000
	let end_time = new Date(end_date).getTime() / 1000


  	let day_list = getDaysArray(new Date(start_date),new Date(end_date))


  	day_chunks = chunk(day_list,7)

  	let report = {}

  	for (let day_chunk of day_chunks){
  		

  		report[day_chunk[0].toISOString().split('T')[0]] = {
  			// label: day_chunk[0].toISOString().split('T')[0],
  			label: (day_chunk[0].getMonth() + 1) + '/' + day_chunk[0].getDate() + '/' + day_chunk[0].getFullYear(),
  			days: day_chunk.map((d)=>{return d.toISOString().split('T')[0]}),
  			users: {}
  		}

  	}


	MongoClient.connect(uri, function(err, client) {

		const db = client.db('ldp');

		var cursor = db.collection('resources').find({});
		let all_users = {}
		cursor.forEach((doc)=>{


			// only work on records built between our ranges
			if (doc.index && doc.index.timestamp && doc.index.timestamp>=  start_time && doc.index.timestamp <= end_time){


				if (!all_users[doc.index.user]){
					all_users[doc.index.user] = 0
				}



				for (let key in report){

					for (let day of report[key].days){
						if (doc.index.time.includes(day)){

							// it contains one of the days, it belongs in this bucket

							if (!report[key].users[doc.index.user]){
								report[key].users[doc.index.user]=0
							}

							report[key].users[doc.index.user]++


						}
						

					}


				}

				

			}






		}, function(err){

			let all_users_alpha = Object.keys(all_users).sort()




			let csvResults = `${request.params.year}${request.params.quarter} Editor Stats, By Cataloger\n`

			csvResults = csvResults +'Cataloger,' + Object.keys(report).map((k)=>{ return report[k].label }).join(',') + ',Created Totals\n'





			for (let u of all_users_alpha){

				let row = [u]

				for (let key in report){

					// did they have activity for this week
					if (report[key].users[u]){
						row.push(report[key].users[u])

						// add to the tottal
						all_users[u] = all_users[u] +  report[key].users[u]
					}else{
						row.push(0)
					}



				}

				// add in the tottal
				row.push(all_users[u])


				csvResults = csvResults + row.join(',') +'\n'

			}

			let totals = ['Created Total']
			let all_total = 0
			for (let key in report){

				let t = 0
				for (let u in report[key].users){
					t = t +  report[key].users[u]
					all_total = all_total + report[key].users[u]
				}

				totals.push(t)
			}
			totals.push(all_total)

			csvResults = csvResults + totals.join(',')





			response.attachment(`stats_new_editor_${request.params.year}${request.params.quarter}.csv`);
			response.status(200).send(csvResults);

		})





		

	});


});


app.post('/delete/:stage/:user/:eid', (request, response) => {

	let result = false 

	if (request.params.stage == 'staging'){
		if (recsStageByUser[request.params.user]){
			if (recsStageByUser[request.params.user][request.params.eid]){
				recsStageByUser[request.params.user][request.params.eid].status = 'deleted'
				result = true
			}
		}
		if (recsStageByEid[request.params.eid]){
			recsStageByEid[request.params.eid].status = 'deleted'
			result = true
		}

	    MongoClient.connect(uri, function(err, db) {
	        if (err) throw err;
	        var dbo = db.db("ldp");	    
	        if (err) throw err;	        
			dbo.collection('resources').findOne({'_id':new mongo.ObjectID(recsStageByEid[request.params.eid]._id)})
			.then(function(doc) {
				if(!doc) throw new Error('No record found.');
				doc.index.status='deleted'				
				dbo.collection('resources').updateOne(
				    {'_id':new mongo.ObjectID(recsStageByEid[request.params.eid]._id)}, 
				    { $set: doc }

				);
			});
	    });





	}else{
		if (recsProdByUser[request.params.user]){
			if (recsProdByUser[request.params.user][request.params.eid]){
				recsProdByUser[request.params.user][request.params.eid].status = 'deleted'
				result = true
			}
		}
		if (recsProdByEid[request.params.eid]){
			recsProdByEid[request.params.eid].status = 'deleted'
			result = true
		}

		// POTENTAIL ERROR HERE, IF THE RECORD IS NOT iN THE recsProdByEid object becase it is > 2weeks
	    MongoClient.connect(uri, function(err, db) {
	        if (err) throw err;
	        var dbo = db.db("ldp");	    
	        if (err) throw err;	        
			dbo.collection('resources').findOne({'_id':new mongo.ObjectID(recsProdByEid[request.params.eid]._id)})
			.then(function(doc) {
				if(!doc) throw new Error('No record found.');
				doc.index.status='deleted'				
				dbo.collection('resources').updateOne(
				    {'_id':new mongo.ObjectID(recsProdByEid[request.params.eid]._id)}, 
				    { $set: doc }
				    
				);
			});
	    });



	}


	response.json({'result':result});


})

app.post('/error/report', (request, response) => {

    MongoClient.connect(uri, function(err, db) {
        if (err) throw err;
        var dbo = db.db("ldp");

        // turn it back into a string for storage because mongo is fusssy about key IDs
        request.body.activeProfile = JSON.stringify(request.body.activeProfile)
        dbo.collection("errorReports").insertOne(request.body, 
        function(err, result) {
            if (err) {
            	response.json({'result':false,'error':err});
            }
            response.json({'result':true,'error':err});
            db.close();
        });
    });
});

app.get('/error/report', (request, response) => {

    MongoClient.connect(uri, function(err, db) {
        if (err) throw err;
        var dbo = db.db("ldp");
		    var cursor = dbo.collection('errorReports').find({});
		    let results = []
		 		cursor.forEach((doc)=>{
		 			results.push({id:doc._id,eId:doc.eId,desc:doc.desc,contact:doc.contact})
		 		}, function(err) {			 		
			 		response.json(results.reverse())
				})


    });
});

app.get('/error/:errorId', (request, response) => {

		try{
			new mongo.ObjectID(request.params.errorId)
		}catch{
			response.json(false);
			return false
		}



    MongoClient.connect(uri, function(err, db) {
        if (err) throw err;
        var dbo = db.db("ldp");

				dbo.collection('errorReports').findOne({'_id':new mongo.ObjectID(request.params.errorId)})
				.then(function(doc) {

					response.type("application/json");


					if(!doc){
						response.json(false);
					}else{


						if (request.query.download){
							response.attachment(`${doc.eId}.json`);
							doc = JSON.parse(doc.activeProfile)
							response.type('json').send(JSON.stringify(doc, null, 2) + '\n');

						}else{
							doc = JSON.parse(doc.activeProfile)

							response.type('json').send(JSON.stringify(doc, null, 2) + '\n');

						}


						
					}
				});
    });
});




app.post('/publish/production', (request, response) => {

	// var shortuuid = require('short-uuid');
	// var decimaltranslator = shortuuid("0123456789");
	// var objid = req.body.objid;
	// var lccn = req.body.lccn;
	// var dirname = __dirname + resources;

	var name = request.body.name + ".rdf";
	var rdfxml = request.body.rdfxml; 

	var url = PRODUCTIONPOSTURL.trim();
	console.log('------')
	console.log(request.body.rdfxml)
	console.log('------')
	console.log('posting to',url)


	let postLogEntry = {
		'postingDate': new Date(),
		'postingEnv': 'production',
		'postingTo': url,
		'postingXML': request.body.rdfxml,

	}



	var options = {
	    method: 'POST',
	    uri: url,
	    body: rdfxml,
	    resolveWithFullResponse: true,
	    headers: { "Content-type": "application/xml" },
	    json: false // Takes JSON as string and converts to Object
	};
	rp(options)
	    .then(function (postResponse) {
	        // {"name": "72a0a1b6-2eb8-4ee6-8bdf-cd89760d9f9a.rdf","objid": "/resources/instances/c0209952430001",
	        // "publish": {"status": "success","message": "posted"}}

	        postLogEntry['postingStatus'] = 'success'
	        postLogEntry['postingStatusCode'] = postResponse.statusCode
	        postLogEntry['postingBodyResponse'] = postResponse.body
	        postLogEntry['postingName'] = request.body.name
		    postLog.push(postLogEntry)
		    if (postLogEntry.length>50){
		    	postLogEntry.shift()
		    }


	        
	        let postStatus = {"status":"published"}

	        if (postResponse.statusCode != 201 && postResponse.statusCode != 204 ){
	        	postStatus = {"status": "error","server": url, "message": postResponse.statusCode }
	        }

			let resp_data = {
                name: request.body.name, 
                // "url": resources + name, 
                //"objid": data.objid, 
                // "lccn": lccn, 
                publish: postStatus
            }
	        
	        
	        response.set('Content-Type', 'application/json');
	        response.status(200).send(resp_data);
	    })
	    .catch(function (err) {
	        // POST failed...
	        console.log(err)

	        postLogEntry['postingStatus'] = 'error'
	        postLogEntry['postingStatusCode'] =  err.StatusCodeError
	        postLogEntry['postingBodyResponse'] = err
	        postLogEntry['postingBodyName'] = request.body.name
	        postLogEntry['postingEid'] = request.body.eid
	        
	        postLog.push(postLogEntry)
	        if (postLogEntry.length>50){
	        	postLogEntry.shift()
	        }


	        errString = JSON.stringify(err)
			let replace = `${MLUSER}|${MLPASS}`;
			let re = new RegExp(replace,"g");
			errString = errString.replace(re, ",'****')");
	        err = JSON.parse(errString)



	        resp_data = {
	                "name": request.body.name, 
	                "objid":  "objid", 
	                "publish": {"status": "error","server": url,"message": err }
	            }
	        response.set('Content-Type', 'application/json');
	        response.status(500).send(resp_data);
	    });


   
});



app.post('/publish/staging', (request, response) => {

	// var shortuuid = require('short-uuid');
	// var decimaltranslator = shortuuid("0123456789");
	// var objid = req.body.objid;
	// var lccn = req.body.lccn;
	// var dirname = __dirname + resources;

	var name = request.body.name + ".rdf";
	var rdfxml = request.body.rdfxml; 


	var url = STAGINGPOSTURL.trim();
	console.log('------')
	console.log(request.body.rdfxml)
	console.log('------')
	console.log('posting to',url)


	let postLogEntry = {
		'postingDate': new Date(),
		'postingEnv': 'production',
		'postingTo': url,
		'postingXML': request.body.rdfxml,

	}




	var options = {
	    method: 'POST',
	    uri: url,
	    body: rdfxml,
	    resolveWithFullResponse: true,
	    headers: { "Content-type": "application/xml" },
	    json: false // Takes JSON as string and converts to Object
	};
	rp(options)
	    .then(function (postResponse) {
	        // {"name": "72a0a1b6-2eb8-4ee6-8bdf-cd89760d9f9a.rdf","objid": "/resources/instances/c0209952430001",
	        // "publish": {"status": "success","message": "posted"}}

	        postLogEntry['postingStatus'] = 'success'
	        postLogEntry['postingStatusCode'] = postResponse.statusCode
	        postLogEntry['postingBodyResponse'] = postResponse.body
	        postLogEntry['postingName'] = request.body.name

		    postLog.push(postLogEntry)
		    if (postLogEntry.length>50){
		    	postLogEntry.shift()
		    }

	        console.log(postResponse)
	        let postStatus = {"status":"published"}

	        if (postResponse.statusCode != 200 ){
	        	postStatus = {"status": "error","server": url, "message": postResponse.statusCode }
	        }

	        	let resp_data = {
                name: request.body.name, 
                //url: resources + name, 
                //objid: data.objid,  
                publish: postStatus
            }
	        

	        response.set('Content-Type', 'application/json');
	        response.status(500).send(resp_data);
	    })
	    .catch(function (err) {
	        // POST failed...

	        errString = JSON.stringify(err)
			let replace = `${MLUSERSTAGE}|${MLPASSSTAGE}`;
			let re = new RegExp(replace,"g");
			errString = errString.replace(re, ",'****')");
	        err = JSON.parse(errString)



	        postLogEntry['postingStatus'] = 'error'
	        postLogEntry['postingStatusCode'] =  err.StatusCodeError
	        postLogEntry['postingBodyResponse'] = err
	        postLogEntry['postingBodyName'] = request.body.name
	        postLogEntry['postingEid'] = request.body.eid
		    postLog.push(postLogEntry)
		    if (postLogEntry.length>50){
		    	postLogEntry.shift()
		    }


	        resp_data = {
	                "name": request.body.name, 
	                "objid":  "objid", 
	                "publish": {"status": "error","server": url,"message": err }
	            }
	        response.set('Content-Type', 'application/json');
	        response.status(500).send(resp_data);
	    });


   
});


app.get('/myrecords/production/:user', function(request, response){
	if (request.params.user){
		response.json(recsProdByUser[request.params.user]);
	}else{
		response.json({});	
	}
});


app.get('/allrecords/production', function(request, response){
	response.json(recsProdByEid);	
});


app.get('/logs/posts', function(request, response){
	response.json(postLog);	
});


app.get('/myrecords/staging/:user', function(request, response){
	if (request.params.user){
		response.json(recsStageByUser[request.params.user]);
	}else{
		response.json({});	
	}
});


app.get('/allrecords/staging', function(request, response){

	response.json(recsStageByEid);	
});



app.get('/allrecords/:env/:searchval/:user', function(request, response){


	
	let env = 'resourcesProduction'
	if (request.params.env === 'staging'){
		env = 'resourcesStaging'		
	}

	let results = {}
	let search = request.params.searchval.toLowerCase()

	MongoClient.connect(uri, function(err, client) {

	    const db = client.db('ldp');

		var searchCursor = db.collection(env).find({});

		searchCursor.forEach((doc)=>{

			if (doc.index){

					
				
					if (doc.index.eid){

						if (request.params.user && request.params.user != 'all'){
							if (doc.index.user != request.params.user){
								return
							}
						}


						if (doc.index.title && doc.index.title.toString().toLowerCase().includes(search)){
							results[doc.index.eid] = doc.index
						}else if (doc.index.eid.toLowerCase().includes(search)){
							results[doc.index.eid] = doc.index
						}else if (doc.index.lccn && doc.index.lccn.toString().includes(search)){
							results[doc.index.eid] = doc.index							
						}else if (doc.index.user && doc.index.user.toString().toLowerCase().includes(search)){
							results[doc.index.eid] = doc.index							
						}else if (doc.index.contributor && doc.index.contributor.toString().toLowerCase().includes(search)){

							results[doc.index.eid] = doc.index							
						}

						// 



					}				
			}

		}).then(function() {

			// console.log(request.params.user, request.params.searchval)
			response.json(results);	

		})

		

		

	})




	

});






app.get('/deploy-production', function(request, response){

	let correctlogin = 'yeet'
	if (request.headers.authorization){
		correctlogin = Buffer.from(`${process.env.DEPLOYPW.replace(/"/g,'')}:${process.env.DEPLOYPW.replace(/"/g,'')}`).toString('base64')
	}
  if (  request.headers.authorization !== `Basic ${correctlogin}`){
    return response.set('WWW-Authenticate','Basic').status(401).send('Authentication required.') // Access denied.   
  }

  // Access granted...
	let r = shell.exec('./deploy-production.sh')		
 	let r_html = `<h1>stdout</h1><pre><code>${r.stdout.toString()}</pre></code><hr><h1>stderr</h1><pre><code>${r.stderr.toString()}</pre></code>`
	
	console.log(r_html)

  return response.status(200).send(r_html)

});


app.get('/deploy-staging', function(request, response){

	let correctlogin = 'yeet'
	if (request.headers.authorization){
		correctlogin = Buffer.from(`${process.env.DEPLOYPW.replace(/"/g,'')}:${process.env.DEPLOYPW.replace(/"/g,'')}`).toString('base64')
	}
  if (  request.headers.authorization !== `Basic ${correctlogin}`){
    return response.set('WWW-Authenticate','Basic').status(401).send('Authentication required.') // Access denied.   
  }

  // Access granted...
	let r = shell.exec('./deploy-staging.sh')		
 	let r_html = `<h1>stdout</h1><pre><code>${r.stdout.toString()}</pre></code><hr><h1>stderr</h1><pre><code>${r.stderr.toString()}</pre></code>`
	
	console.log(r_html)

  return response.status(200).send(r_html)

});

app.get('/deploy-profile-editor', function(request, response){

	// let correctlogin = 'yeet'
	// if (request.headers.authorization){
	// 	correctlogin = Buffer.from(`${process.env.DEPLOYPW.replace(/"/g,'')}:${process.env.DEPLOYPW.replace(/"/g,'')}`).toString('base64')
	// }
 //  if (  request.headers.authorization !== `Basic ${correctlogin}`){
 //    return response.set('WWW-Authenticate','Basic').status(401).send('Authentication required.') // Access denied.   
 //  }

  // Access granted...
	let r = shell.exec('./deploy-profile-editor.sh')		
 	let r_html = `<h1>stdout</h1><pre><code>${r.stdout.toString()}</pre></code><hr><h1>stderr</h1><pre><code>${r.stderr.toString()}</pre></code>`
	
	console.log(r_html)

  return response.status(200).send(r_html)

});



app.get('/dump/xml/prod', function(request, response){



	



	let correctlogin = 'yeet'
	if (request.headers.authorization){
		correctlogin = Buffer.from(`${process.env.DEPLOYPW.replace(/"/g,'')}:${process.env.DEPLOYPW.replace(/"/g,'')}`).toString('base64')
	}
	if (  request.headers.authorization !== `Basic ${correctlogin}`){
		return response.set('WWW-Authenticate','Basic').status(401).send('Authentication required.') // Access denied.   
	}



	fs.rmdirSync('/tmp/dumps/', { recursive: true });
	fs.mkdirSync('/tmp/dumps/');



	MongoClient.connect(uri, function(err, client) {

		const db = client.db('ldp');

		var cursor = db.collection('resourcesProduction').find({});
		let all_users = {}
		cursor.forEach((doc)=>{

			
			let lastone = doc.versions.length-1



			// console.log(doc.index.status)
			// console.log(doc.index.eid)
			// console.log(typeof doc.versions[lastone].content)




			// if the sub dir doesnt exist make it
			if (!fs.existsSync('/tmp/dumps/'+doc.index.status)){
			    fs.mkdirSync('/tmp/dumps/'+doc.index.status);
			}


			if (typeof doc.versions[lastone].content === 'string'){
				fs.writeFileSync( '/tmp/dumps/'+doc.index.status + '/' + doc.index.eid + '.xml' , doc.versions[lastone].content)
			}



		}, function(err){


			if (err){
				response.status(500).send(err);	
			}else{
				
				(async() => {

					await zip.zip('/tmp/dumps/', '/tmp/dumps.zip');

					let date_ob = new Date();

					
					
					let date = ("0" + date_ob.getDate()).slice(-2);

					
					let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

					
					let year = date_ob.getFullYear();

					
					let hours = date_ob.getHours();

					
					let minutes = date_ob.getMinutes();

					
					let seconds = date_ob.getSeconds();

					



					response.setHeader('Content-disposition', 'attachment; filename=bfe2_dump_' + year + "-" + month + "-" + date + '.zip');

					response.setHeader("content-type", "application/zip");

					fs.createReadStream("/tmp/dumps.zip").pipe(response);



				})();



			}

		})





		

	});


});




console.log('listending on 5200')
app.listen(5200);

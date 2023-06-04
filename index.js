const express = require('express')
const app = express()
const cors = require('cors')
//*** my changes
const bodyParser = require('body-parser');
const { MongoClient, ServerApiVersion, mongo } = require('mongodb');
const uri = "mongodb+srv://robostud:HellSpawn2023@cluster0robostud.zoszsjd.mongodb.net/?retryWrites=true&w=majority";
const clientMongoDB = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
//*** my changes
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(bodyParser.urlencoded({extended: true}));
app.post("/api/users", async function(req, res){
  await clientMongoDB.connect();
  var db = await clientMongoDB.db("tracker");
  let collection = await db.collection("User");
  try {
    //check if username exists on db
    let resultsFind = await collection.find({username: req.body.username}).toArray();
    if(resultsFind.length == 0) {
      //not found, insert new username
      let newUsernameOBJ = { username: req.body.username};
      let resultInsert = await collection.insertOne(newUsernameOBJ);
      await clientMongoDB.close();
      res.json({username: newUsernameOBJ.username, _id: String(resultInsert.insertedId)});
    }
    else {
      //found, return with data
      await clientMongoDB.close();
      res.json({username: resultsFind[0].username, _id: resultsFind[0]._id});
    }
  }
  catch {
    res.json({error: "post /api/users: error on find or insert"});
  }
});

app.get("/api/users", async function(req, res){
  await clientMongoDB.connect();
  var db = await clientMongoDB.db("tracker");
  let collection = await db.collection("User");

  try {
    //get all users
    let resultsFind = await collection.find({}).toArray();
    if(resultsFind.length == 0) {
      await clientMongoDB.close();
      res.json({error: "get /api/users: empty collection"});
    }
    else {
      //console.log(resultsFind);
      await clientMongoDB.close();
      //create response object
      let objRes = [];
      resultsFind.forEach(function(item){
        objRes.push({username: item.username, _id: String(item._id)});
      })
      res.json(objRes);
    }
  }
  catch {
    res.json({error: "get /api/users: error on find"});
  }
});

app.post("/api/users/:_id/exercises", async function(req, res){
  var realDate;
  if(req.body.date == undefined) {
    realDate = new Date(Date.now()); //.toDateString()
    }
    else if(req.body.date == "") {
      realDate = new Date(Date.now());
    }
    else {
      if(!isNaN(req.body.date)) {
        realDate = new Date(parseInt(req.body.date));
      }
      else {
        //check if date is valid
        if(isNaN(Date.parse(req.body.date))) {
          realDate = new Date(Date.now());
          }
          else {
            realDate = new Date(req.body.date);
        }
      }
    }
  switch(req.body.description) {
  case undefined:
    res.json({error: "/api/users/:_id/exercises: missing mandatory data"});
    break;
  case "":
    res.json({error: "/api/users/:_id/exercises: missing mandatory data"});
    break;
  }
  switch(req.body.duration) {
  case undefined:
    res.json({error: "/api/users/:_id/exercises: missing mandatory data"});
    break;
  case "":
    res.json({error: "/api/users/:_id/exercises: missing mandatory data"});
    break;
  }
  if(isNaN(req.body.duration)) {
    res.json({error: "/api/users/:_id/exercises: duration must be a number"});
  }

  try {
    await clientMongoDB.connect();
    var db = await clientMongoDB.db("tracker");
    let collection = await db.collection("User");
    var ObjectId = require('mongodb').ObjectId;
    let resultsFind = await collection.find({_id : new ObjectId(req.params._id)}).toArray();
    //console.log(resultsFind);
    if(resultsFind.length == 0) {
      //not found
      await clientMongoDB.close();
      res.json({error: "/api/users/:_id/exercises: _id not found"});
    }
    else {
      //insert into Exercise
      collection = await db.collection("Exercise");
      let newExerciseOBJ = {
        username: resultsFind[0].username,
        description: req.body.description,
        duration: parseInt(req.body.duration),
        date: realDate,
        idUser: resultsFind[0]._id
      };
      let resultInsert = await collection.insertOne(newExerciseOBJ);
      await clientMongoDB.close();
      resultsFind[0].description = req.body.description;
      resultsFind[0].duration = parseInt(req.body.duration);
      resultsFind[0].date = realDate.toDateString();
      res.json(resultsFind[0]);
    }
  }
  catch {
    await clientMongoDB.close();
    res.json({error: "/api/users/:_id/exercises: error on find or insert"});
  }
});

app.get("/api/users/:_id/logs", async function(req, res){
  // console.log(req.query.limit);
  // console.log(req.query.from);
  // console.log(req.query.to);
  // res.send("OK");
  try {
    await clientMongoDB.connect();
    var db = clientMongoDB.db("tracker");
    let collection = db.collection("User");
    var ObjectId = require('mongodb').ObjectId;
    let resultsFind = await collection.find({_id : new ObjectId(req.params._id)}).toArray();
    if(resultsFind.length == 0) {
      //not found
      await clientMongoDB.close();
      res.json({error: "/api/users/:_id/logs: _id not found"});
    }
    else {
      //find all exercises
      collection = db.collection("Exercise");
      let resultsExFind;
      if(req.query.limit == undefined && req.query.from == undefined) {
        //get all
        resultsExFind = await collection.find({idUser : new ObjectId(req.params._id)}).toArray();
      }
      else if(req.query.limit == undefined && req.query.from != undefined)
      {
        //get data
        // let filter = {
        //   idUser : new ObjectId(req.params._id),
        //   date : {$gte: new Date(req.query.from)},
        //   date : {$lte: new Date(req.query.to)}
        // };
        // resultsExFind = await collection.find(filter).toArray();
        resultsExFind = await collection.find({
          idUser : new ObjectId(req.params._id),
          date : { $gte: new Date(req.query.from) },
          date : { $lte: new Date(req.query.to) }
        }).toArray();
      }
      else if(req.query.limit != undefined && req.query.from == undefined) {
        //get limit
        resultsExFind = await collection.find({idUser : new ObjectId(req.params._id)}).limit(parseInt(req.query.limit)).toArray();
      }
      else {
        //get limit + date
        let filter = {
          idUser : new ObjectId(req.params._id),
          date : {$gte: new Date(req.query.from)},
          date : {$lte: new Date(req.query.to)}
        };
        resultsExFind = await collection.find(filter).sort({ date: 'desc' }).limit(parseInt(req.query.limit)).toArray();
      }
      //return result
      resultsFind[0]._id = String(resultsFind[0]._id);
        resultsFind[0].count = resultsExFind.length;
        resultsFind[0].log = [];
        resultsExFind.forEach(function(item){
        resultsFind[0].log.push({
          description: item.description,
          duration: parseInt(item.duration),
          date: item.date.toDateString()
        });
      });
        res.json(resultsFind[0]);
    }
  }
  catch {
    await clientMongoDB.close();
    res.json({error: "/api/users/:_id/logs: error on find"});
  }
});

app.get("/api/deleteCollection", async function(req, res){
  try {
    await clientMongoDB.connect();
    var db = clientMongoDB.db("tracker");
    let collectionUser = db.collection("User");
    let collectionExercise = db.collection("Exercise");
    await collectionUser.deleteMany({});
    await collectionExercise.deleteMany({});
    clientMongoDB.close();
    res.send("ok");
  }
  catch(error) {
    clientMongoDB.close();
    res.send(error);
  }
  
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

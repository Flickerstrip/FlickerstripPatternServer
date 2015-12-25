var Sequelize = require('sequelize');
var passwordHash = require('password-hash');
var bodyParser = require('body-parser');
var db = require('credentials.js');

var forceSync = true;

var sequelize = new Sequelize(db.database,db.user,db.password,{
    host:db.host,
    port:db.port
});

var Users = sequelize.define('Users', {
  email: Sequelize.STRING,
  display: Sequelize.STRING,
  passwordHash: Sequelize.STRING,
  lastlogin: Sequelize.DATE,
});

var Patterns = sequelize.define('Patterns', {
  name: Sequelize.STRING,
  type: Sequelize.STRING,
});
Patterns.belongsTo(Users, {as: 'Owner'});

var PatternData = sequelize.define('PatternData', {
    data: Sequelize.BLOB
});
Patterns.hasOne(PatternData,{foreignKeyConstraint: true, onDelete: 'cascade'});
PatternData.belongsTo(Patterns,{onDelete:"CASCADE",foreignKeyConstraint: true});

var UserVotes = sequelize.define('UserVotes', {
    score: Sequelize.INTEGER
})

Patterns.belongsToMany(Users, {as: 'Votes', through: UserVotes});
Users.belongsToMany(Patterns, {as: 'Votes', through: UserVotes});

sequelize.sync({"force":forceSync}).then(function() {
});

function createUser(email,display,password) {
    var hash = passwordHash.generate(password);

    return Users.create({
        email: email,
        display: display,
        passwordHash: hash,
        lastlogin: null,
    });
}

function createPattern(patternName,user,type,data) {
    if (type == "pixels") data = new Buffer(data, 'base64'); //pixels come as base64 encoded
    if (type == "javascript") data = new Buffer(data); //not necessary, i guess?

    PatternData.create({
        data:data,
    }).then(function(patternData) {
        Patterns.create({
            name: patternName,
            type: type,
        }).then(function(pattern) {
            pattern.setOwner(user);
            patternData.setPattern(pattern);
        });
    });
}

var basicAuth = require('basic-auth');
var express = require('express');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var auth = function (req, res, next) {
    var challenge = basicAuth(req);
    if (!challenge) return res.sendStatus(401);

    Users.findOne({where:{email:challenge.name}}).then(function(user) {
        if (user && passwordHash.verify(challenge.pass,user.passwordHash)) {
            req.user = user;
            next();
        } else {
            res.sendStatus(401);
        }
    });
};

var server = app.listen(process.env.PORT, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening on port: %s', port);
});

app.post('/user/challenge',auth,function (req, res) {
    res.status(200).send(JSON.stringify(req.user));
});

app.post('/user/create', function (req, res) {
    Users.findOne({where:{email:req.body.email}}).then(function(user) {
        if (user) return res.status(500).send("User Exists!");
        createUser(req.body.email,req.body.display,req.body.password).then(function(user) {
            res.status(200).send(JSON.stringify(user));
        });
    });
});

app.post('/pattern/create',auth,function (req, res) {
    if (req.body.type != "javascript" && req.body.type != "pixels") return res.sendStatus(500);
    createPattern(req.body.name,req.user,req.body.type,req.body.data);
    res.sendStatus(200);
});

app.post('/pattern/delete',auth,function (req, res) {
    Patterns.findOne({where:{id:req.body.id},include:[{model:Users,as:'Owner',attributes:['id','display']}]}).then(function(pattern) {
        console.log("Deleting pattern",pattern.name);
        pattern.destroy().then(function() {
            res.sendStatus(200);
        });
//        pattern.getPatternData().then(function(patternData) {
//            patternData.destroy().then(function() {
//                pattern.destroy().then(function() {
//                    res.sendStatus(200);
//                });
//            });
//        });
    });
});

app.get('/pattern',function (req, res) {
    Patterns.findAll({include:[{model:Users,as:'Owner',attributes:['id','display']}]}).then(function(patterns) {
        res.status(200).send(JSON.stringify(patterns));
    });
});

app.get('/pattern/:id',function (req, res) {
    PatternData.findOne({where:{patternId:req.params.id}}).then(function(patterndata) {
        res.status(200).send(patterndata.data);
    });
});

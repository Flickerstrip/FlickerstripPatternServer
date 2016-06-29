var passwordHash = require('password-hash');
var bodyParser = require('body-parser');
var db = require("./db.js");
var app = require('express')();
var auth = require("./authentication.js");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.use(function(req,res,next) {
    res.header('Access-Control-Allow-Origin: http://flickerstrip.com');
    next();
});

app.use('/user', require('./userController.js'));
app.use('/pattern', require('./patternController.js'));

var server = app.listen(process.env.PORT, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening on port: %s', port);
});


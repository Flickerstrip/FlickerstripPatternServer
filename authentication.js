var bcrypt = require("bcrypt-nodejs");
var _ = require("underscore");
var db = require("./db.js");
var basicAuth = require('basic-auth');
var path = require("path");

var env       = process.env.NODE_ENV || "development";
var config    = require(path.join(__dirname, 'config', 'config.json'))[env];

module.exports = function(required) {
    function validateCredentials(email,password,cb) {
        var query = "SELECT user_id,user_type,user_email,username,user_password FROM `"+config.phpbb.prefix+"users` WHERE user_email='"+email+"'";
        db.phpbb.query(query, { type: sequelize.QueryTypes.SELECT}).then(function(results) {
            if (results.length == 0) {
                return cb(false,false,"User doesn't exist!");
            }
            if (results.length > 1) return cb(false,results,"Multiple matching users!");

            var user = results[0];
            if (user.user_type == 1) return cb(false,user.user_id,"User not activated!");

            bcrypt.compare(password,user.user_password.replace('$2y$', '$2a$'),function(err,valid) {
                return cb(valid,user,!valid ? "Password doesn't match" : undefined);
            });
        })
    }

    function getUser(req,res,cb) {
        if (req.session.user) { //user is logged in via session
            Users.findOne({where:{email:req.session.user.email}}).then(function(user) {
                cb(user);
            });
            return;
        }

        var challenge = basicAuth(req);
        if (!challenge) return cb(null);

        validateCredentials(challenge.name,challenge.pass,function(valid,bbuser,message) {
            if (valid) {
                Users.findOne({where:{phpbbId:bbuser.user_id}}).then(function(user) {
                    if (user) {
                        //we found the user based on their phpbbId
                        user.email = bbuser.user_email;
                        user.display = bbuser.username;
                        user.lastlogin = new Date();
                        user.save();
                        return cb(user);
                    }

                    Users.findOne({where:{email:challenge.name}}).then(function(user) {
                        if (user) {
                            //we found the user based on their email
                            user.phpbbId = bbuser.user_id;
                            user.display = bbuser.username;
                            user.lastlogin = new Date();
                            user.save();
                            return cb(user);
                        } else {
                            //we havent found this user by ID or by email, let's create an entry
                            Users.create({
                                email: bbuser.user_email,
                                phpbbId: bbuser.user_id,
                                display: bbuser.username,
                                lastlogin: new Date(),
                            }).then(function(user) {
                                cb(user);
                            });
                        }
                    });
                });
            } else {
                console.log("invalid login: ",message);
                return cb(null);
            }
        });
    }

    return (function (req, res, next) {
        getUser(req,res,function(user) {
            if (!user && required) return res.sendStatus(401);

            req.user = user;
            req.isRoot = user && user.email == "admin@hohmbody.com";
            next();
        })
    })
}


var router = require('express').Router();
var db = require("./db.js");
var auth = require("./authentication.js");

function createUser(email,display,password) {
    var hash = passwordHash.generate(password);

    return Users.create({
        email: email,
        display: display,
        passwordHash: hash,
        lastlogin: null,
    });
}

router.post('/challenge',auth,function (req, res) {
    res.status(200).send(JSON.stringify(req.user));
});

router.post('/create', function (req, res) {
    Users.findOne({where:{email:req.body.email}}).then(function(user) {
        if (user) return res.status(500).send("User Exists!");
        createUser(req.body.email,req.body.display,req.body.password).then(function(user) {
            res.status(200).send(JSON.stringify(user));
        });
    });
});

module.exports = router;

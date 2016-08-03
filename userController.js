var router = require('express').Router();
var auth = require("./authentication.js");


/*
function createUser(email,display,password) {
    var hash = passwordHash.generate(password);

    return Users.create({
        email: email,
        display: display,
        passwordHash: hash,
        lastlogin: null,
    });
}
*/

router.post('/challenge',auth(true),function (req, res) {
    res.status(200).send(req.user);
});

/*
router.post('/create', function (req, res) {
    Users.findOne({where:{email:req.body.email}}).then(function(user) {
        if (user) return res.status(500).send("User Exists!");
        createUser(req.body.email,req.body.display,req.body.password).then(function(user) {
            res.status(200).send(user);
        });
    });
});
*/

//Handle session login
router.post('/login',auth(true),function (req, res) {
    req.session.user = req.user;
    res.status(200).send(req.user);
});

router.post('/logout',auth(true),function (req, res) {
    req.session.user = null;
    res.status(200).send("OK");
});

router.get('/current',function (req, res) {
    res.status(200).send(req.session.user);
});

router.get('/:id',function (req, res) {
    Users.findOne({where:{id:req.params.id}}).then(function(user) {
        res.status(200).send(user);
    });
});

router.get('/:id/patterns',function (req, res) {
    Patterns.findAll({where:{ownerId:req.params.id}}).then(function(patterns) {
        res.status(200).send(patterns);
    });
});

module.exports = router;

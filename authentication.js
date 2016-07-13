var passwordHash = require('password-hash');
var basicAuth = require('basic-auth');

module.exports = function (req, res, next) {
    if (req.session.user) { //user is logged in via session
        Users.findOne({where:{email:req.session.user.email}}).then(function(user) {
            req.user = user;
            next();
        });
        return;
    }

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


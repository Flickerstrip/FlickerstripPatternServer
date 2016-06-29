var basicAuth = require('basic-auth');

module.exports = function (req, res, next) {
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


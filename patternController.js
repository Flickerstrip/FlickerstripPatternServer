var router = require('express').Router();
var db = require("./db.js");
var auth = require("./authentication.js");

function createPattern(patternName,user,type,data,fps,frames,pixels) {
    if (type == "bitmap") data = new Buffer(data, 'base64'); //bitmaps come as base64 encoded
    if (type == "javascript") data = new Buffer(data); //not necessary, i guess?

    var params = {
        name: patternName,
        type: type
    }

    if (type == "bitmap") {
        params.fps = fps;
        params.pixels = pixels;
        params.frames = frames;
    }

    PatternData.create({
        data:data,
    }).then(function(patternData) {
        Patterns.create(params).then(function(pattern) {
            pattern.setOwner(user);
            patternData.setPattern(pattern);
        });
    });
}

router.post('/create',auth,function (req, res) {
    if (req.body.type != "javascript" && req.body.type != "bitmap") return res.sendStatus(500);

    createPattern(req.body.name,req.user,req.body.type,req.body.data,req.body.fps,req.body.frames,req.body.pixels);

    res.sendStatus(200);
});

router.post('/delete',auth,function (req, res) {
    Patterns.findOne({where:{id:req.body.id},include:[{model:Users,as:'Owner',attributes:['id','display']}]}).then(function(pattern) {
        console.log("Deleting pattern",pattern.name);
        pattern.destroy().then(function() {
            res.sendStatus(200);
        });
    });
});

router.get('/',function (req, res) {
    Patterns.findAll({include:[{model:Users,as:'Owner',attributes:['id','display']}]}).then(function(patterns) {
        res.status(200).send(JSON.stringify(patterns));
    });
});

router.get('/:id',function (req, res) {
    Patterns.findOne({where:{id:req.params.id}}).then(function(pattern) {
        PatternData.findOne({where:{patternId:req.params.id}}).then(function(patterndata) {
            console.log("raw",patterndata.data);
            if (pattern.type == "bitmap") patterndata.data = patterndata.data.toString('base64');
            console.log("b64",patterndata.data);
            res.status(200).send(patterndata.data);
        });
    });
});

module.exports = router;

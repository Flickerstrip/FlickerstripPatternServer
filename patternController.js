var Sequelize = require('sequelize');
var router = require('express').Router();
var db = require("./db.js");
var auth = require("./authentication.js");
var PatternClass = require("./Pattern.js");
var _ = require("underscore");

function createPattern(user,pattern,cb) {
    var patternTableParams = {
        name: pattern.name,
        fps: pattern.fps,
        pixels: pattern.pixels,
        frames: pattern.frames,
    }

    console.log("creating pat with user",user);
    console.log("pattern table params",patternTableParams);
    PatternPixelData.create({
        data:new Buffer(pattern.pixelData),
    }).then(function(patternPixelData) {
        console.log("done creating pixel data");
        if (pattern.code) {
            console.log("creating code");
            PatternCodeSnippets.create({
                data:new Buffer(pattern.code),
            }).then(function(patternCodeSnippet) {
                console.log("done creating coded");
                Patterns.create(patternTableParams).then(function(dbPattern) {
                    console.log("done creating pttern");
                    dbPattern.setOwner(user);
                    patternPixelData.setPattern(dbPattern);
                    patternCodeSnippet.setPattern(dbPattern);
                    if (cb) cb();
                });
            });
        } else {
            console.log("no code");
            Patterns.create(patternTableParams).then(function(dbPattern) {
                console.log("done creating pttern");
                dbPattern.setOwner(user);
                patternPixelData.setPattern(dbPattern);
                if (cb) cb();
            });
        }
    });
}

router.post('/create',auth,function (req, res) {
    var pattern = new PatternClass();
    pattern.deserializeFromJSON(req.rawBody);

    createPattern(req.user,pattern,function() {
        res.sendStatus(200);
    });
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

router.post('/:id/update',function (req, res) {
    Patterns.findOne({
        where:{id:req.params.id},
        include: [{
            model: PatternPixelData,
            where: { PatternId: Sequelize.col('patterns.id') },
            required: false,
        },
        {
            model: PatternCodeSnippets,
            where: { PatternId: Sequelize.col('patterns.id') },
            required: false,
        },
        ]
    }).then(function(dbPattern) {
        var pattern = new PatternClass();
        pattern.deserializeFromJSON(req.rawBody);

        dbPattern.name = pattern.name;
        dbPattern.fps = pattern.fps;
        dbPattern.frames = pattern.frames;
        dbPattern.pixels = pattern.pixels;

        dbPattern.save().then(function() {
            //update body
            dbPattern.PatternPixelDatum.data = new Buffer(pattern.pixelData);
            dbPattern.PatternPixelDatum.save().then(function() {
                res.status(200).send("OK");
            });
        });
    });
});

router.get('/:id',function (req, res) {
    Patterns.findOne({
        where:{id:req.params.id},
        raw: true,
        include: [{
            model: PatternPixelData,
            where: { PatternId: Sequelize.col('patterns.id') },
            required: false,
        },
        {
            model: PatternCodeSnippets,
            where: { PatternId: Sequelize.col('patterns.id') },
            required: false,
        },
        ]
    }).then(function(obj) {
        var pixelData = obj["PatternPixelDatum.data"];
        var code = obj["PatternCodeSnippet.data"] ? obj["PatternCodeSnippet.data"].toString("ascii") : null;

        var pattern = new PatternClass();
        _.extend(pattern,{
            id: obj.id,
            name: obj.name,
            fps: obj.fps,
            frames: obj.frames,
            pixels: obj.pixels,
            code: code,
            pixelData: Array.prototype.slice.call(pixelData, 0),
        });

        res.contentType("application/json");
        res.status(200).send(pattern.serializeToJSON());
    });

    /*
    Patterns.findOne({where:{id:req.params.id}}).then(function(pattern) {
        PatternPixelData.findOne({where:{patternId:req.params.id}}).then(function(patterndata) {
            patterndata.data = patterndata.data.toString('base64');
            res.status(200).send(patterndata.data);
        });
    });
    */
});

module.exports = router;

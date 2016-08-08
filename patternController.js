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
        published: pattern.published,
    }

    PatternPixelData.create({
        data:new Buffer(pattern.pixelData),
    }).then(function(patternPixelData) {
        if (pattern.code) {
            PatternCodeSnippets.create({
                data:new Buffer(pattern.code),
            }).then(function(patternCodeSnippet) {
                Patterns.create(patternTableParams).then(function(dbPattern) {
                    dbPattern.setOwner(user);
                    patternPixelData.setPattern(dbPattern);
                    patternCodeSnippet.setPattern(dbPattern);
                    if (cb) cb(dbPattern);
                });
            });
        } else {
            Patterns.create(patternTableParams).then(function(dbPattern) {
                dbPattern.setOwner(user);
                patternPixelData.setPattern(dbPattern);
                if (cb) cb(dbPattern);
            });
        }
    });
}

router.post('/create',auth(true),function (req, res) {
    var pattern = new PatternClass();
    pattern.fromJSON(req.rawBody);

    createPattern(req.user,pattern,function(obj) {
        var pattern = new PatternClass();
        _.extend(pattern,{
            id: obj.id,
            name: obj.name,
            fps: obj.fps,
            frames: obj.frames,
            pixels: obj.pixels,
            published: obj.published === 1,
        });
        res.status(200).send(pattern);
    });
});

router.post('/:id/delete',auth(true),function (req, res) {
    Patterns.findOne({where:{id:req.params.id},include:[{model:Users,as:'Owner',attributes:['id','display']}]}).then(function(pattern) {
        console.log("Deleting pattern",pattern.name);
        pattern.destroy().then(function() {
            res.sendStatus(200);
        });
    });
});

//paginate with?size=20&page=0
var paginate = function(req,res,next) {
    req.page = parseInt(req.query.page) || 0;
    req.limit = parseInt(req.query.size) || 10;
    req.offset = req.limit * (req.page);
    next();
}
//TODO break pagination out into better middlewear
router.get('/',auth(false),paginate,function (req, res) {
    var sortBy = req.query.sortBy ? req.query.sortBy.split(" ") : ["createdAt","DESC"];
    if (sortBy.length == 1) sortBy.push("ASC");

    var sequelizeSortBy = sortBy.slice(0)
    if (sequelizeSortBy[0] == "rating") sequelizeSortBy[0] = sequelize.col("PatternScore.score");

    var opt = {order:[sequelizeSortBy],raw:true,offset:req.offset,limit:req.limit,where:{published:true},include:[{model:PatternScores,where:{PatternId: Sequelize.col('Patterns.id')},required:false},{model:Users,as:'Owner',attributes:['id','display']}]};
    var showAll = req.isRoot && req.query.all !== undefined;
    if (showAll) delete opt.where;
    if (req.query.includeData !== undefined) {
        opt.include.push({model:PatternPixelData,attributes:['data']});
    }
    if (req.user) {
        opt.include.push({
            model:Users,
            as:"Vote",
            where: {
                id: req.user.id,
            },
            required: false,
        });
    }
    var countOpt = showAll ? {} : {where:{published:true}};
    Patterns.count(countOpt).then(function(count) {
        Patterns.findAll(opt).then(function(patterns) {
            patterns = _.map(patterns,function(obj) {
                var pixelData = obj["PatternPixelDatum.data"];
                var pattern = new PatternClass();
                _.extend(pattern,{
                    id: obj.id,
                    name: obj.name,
                    fps: obj.fps,
                    frames: obj.frames,
                    pixels: obj.pixels,
                    owner: {
                        id: obj["OwnerId"],
                        display: obj["Owner.display"],
                    },
                    published: obj.published === 1,
                    points: obj["PatternScore.points"],
                });
                if (obj["Vote.UserVotes.score"]) pattern.vote = obj["Vote.UserVotes.score"];
                if (pixelData) pattern.pixelData = Array.prototype.slice.call(pixelData, 0);
                return pattern;
            });
            res.status(200).send(JSON.stringify({
                results:patterns,
                page:req.page,
                pageSize:req.limit,
                totalPages: Math.ceil(count/req.limit),
                sortBy: sortBy.join(" "),
                total: count,
            }));
        });
    });
});

router.post('/:id/update',auth(true),function (req, res) {
    Patterns.findOne({
        where:{id:req.params.id},
        include: [{
            model: PatternPixelData,
            where: { PatternId: Sequelize.col('Patterns.id') },
            required: false,
        },
        {
            model: PatternCodeSnippets,
            where: { PatternId: Sequelize.col('Patterns.id') },
            required: false,
        },
        ]
    }).then(function(dbPattern) {
        if (!req.isRoot && dbPattern.OwnerId != req.user.id) return res.status(403).send("You don't own this pattern");

        var pattern = new PatternClass();
        pattern.fromJSON(req.rawBody);

        dbPattern.name = pattern.name;
        dbPattern.fps = pattern.fps;
        dbPattern.frames = pattern.frames;
        dbPattern.pixels = pattern.pixels;
        dbPattern.published = pattern.published;

        dbPattern.save().then(function(dbPattern) {
            //update body
            dbPattern.PatternPixelDatum.data = new Buffer(pattern.pixelData);
            dbPattern.PatternPixelDatum.save().then(function(patternData) {
                var pattern = new PatternClass();
                _.extend(pattern,{
                    id: dbPattern.id,
                    name: dbPattern.name,
                    fps: dbPattern.fps,
                    frames: dbPattern.frames,
                    pixels: dbPattern.pixels,
                    published: dbPattern.published == true,
                });
                res.status(200).send(pattern);
            });
        });
    });
});

router.post('/:id/vote',auth(true),function (req, res) {
    var vote = req.body.score;
    if (vote != 1 && vote != -1) return res.sendStatus(500);

    UserVotes.findOne({
        where:{userId:req.user.id,patternId:req.params.id}
    }).then(function(found) {
        if (found) found.destroy();

        Patterns.findOne({
            where:{id:req.params.id},
        }).then(function(pattern) {
            UserVotes.create({
                score: vote,
                UserId: req.user.id,
                PatternId: pattern.id
            }).then(function(vote) {
                res.sendStatus(200);
            });
        });
    });
});

router.get('/:id',auth(false),function (req, res) {
    Patterns.findOne({
        where:{id:req.params.id},
        raw: true,
        include: [{
            model: PatternPixelData,
            where: { PatternId: Sequelize.col('Patterns.id') },
            required: false,
        },
        {
            model: PatternCodeSnippets,
            where: { PatternId: Sequelize.col('Patterns.id') },
            required: false,
        },
        {model:Users,as:'Owner',attributes:['id','display']}
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
            published: obj.published,
            code: code,
            owner: {
                id: obj["OwnerId"],
                display: obj["Owner.display"],
            },
            pixelData: Array.prototype.slice.call(pixelData, 0),
        });

        res.contentType("application/json");
        res.status(200).send(JSON.stringify(pattern));
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

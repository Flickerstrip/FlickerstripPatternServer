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
    console.log("raw body",req.rawBody);
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

//TODO clean this up a bit.. ugh
function getPatterns(sortBy,offset,limit,includeUnpublished,includeData,withUserVotes,cb) {
    if (sortBy[0] == "rating") {
        var fields = {
            "id":"p.id",
            "name":"p.name",
            "fps":"p.fps",
            "pixels":"p.pixels",
            "frames":"p.frames",
            "published":"p.published",
            "OwnerId":"p.OwnerId",
            "Owner.display":"u.display",
            "PatternScore.points":"s.points",
        };
        if (includeData) fields["PatternPixelDatum.data"] = "d.data";

        var query = "FROM Patterns p, PatternScores s,Users u,PatternPixelData d WHERE p.published=1 AND p.id=s.patternId AND u.id=p.OwnerId AND p.id=d.patternId ORDER BY s.score DESC LIMIT "+offset+", "+limit;
        if (withUserVotes) {
            fields["Vote.UserVotes.score"] = "v.score";
            query = "FROM PatternScores s,Users u,PatternPixelData d, Patterns p LEFT OUTER JOIN UserVotes v ON v.PatternId=p.id AND v.UserId="+withUserVotes.id+" WHERE p.published=1 AND p.id=s.patternId AND u.id=p.OwnerId AND p.id=d.patternId ORDER BY s.score DESC LIMIT "+offset+", "+limit;
        }

        var fieldString = _.reduce(fields,function(memo,value,key) {
            return memo+", "+value+" AS `"+key+"`";
        },"");
        fieldString = fieldString.substring(2);

        sequelize.query("SELECT count(*) AS count "+query,{type:sequelize.QueryTypes.SELECT}).then(function(res) {
            var count = res[0].count;
            sequelize.query("SELECT "+fieldString+" "+query,{type:sequelize.QueryTypes.SELECT}).then(function(patterns) {
                cb(count,patterns);
            });
        });
    } else {
        var opt = {order:[sortBy],raw:true,offset:offset,limit:limit,where:{published:true},include:[{model:PatternScores,as:'PatternScore',where:{PatternId: Sequelize.col('Patterns.id')},required:false},{model:Users,as:'Owner',attributes:['id','display']}]};
        if (includeUnpublished) delete opt.where;
        if (includeData) {
            opt.include.push({model:PatternPixelData,attributes:['data']});
        }
        if (withUserVotes) {
            opt.include.push({
                model:Users,
                as:"Vote",
                where: {
                    id: withUserVotes.id,
                },
                required: false,
            });
        }

        var countOpt = includeUnpublished ? {} : {where:{published:true}};
        Patterns.count(countOpt).then(function(count) {
            Patterns.findAll(opt).then(function(patterns) {
                cb(count,patterns);
            });
        });
    }
}

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

    var includeUnpublished = req.isRoot && req.query.all !== undefined;
    var includeData = req.query.includeData !== undefined;
    getPatterns(sortBy,req.offset,req.limit,includeUnpublished,includeData,req.user,function(count,patterns) {
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

        _.extend(dbPattern,pattern);

        dbPattern.update(pattern,{fields: _.keys(pattern)}).then(function(dbPattern) {
            var pattern = new PatternClass();
            _.extend(pattern,{
                id: dbPattern.id,
                name: dbPattern.name,
                fps: dbPattern.fps,
                frames: dbPattern.frames,
                pixels: dbPattern.pixels,
                published: dbPattern.published == true,
            });

            //update body
            if (pattern.pixelData) {
                dbPattern.PatternPixelDatum.data = new Buffer(pattern.pixelData);
                dbPattern.PatternPixelDatum.save().then(function(patternData) {
                    res.status(200).send(pattern);
                });
            } else {
                res.status(200).send(pattern);
            }
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

router.get('/loadPatternData',auth(false),function (req,res) {
    var ids = _.map(req.query.ids.split(","),function(x){return parseInt(x);});
    Patterns.findAll({
        where:{id: {in: ids}},
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
    }).then(function(results) {
        var patterns = {};

        _.each(results,function(obj) {
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

            patterns[obj.id] = pattern;
        });

        res.contentType("application/json");
        res.status(200).send(JSON.stringify(patterns));
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

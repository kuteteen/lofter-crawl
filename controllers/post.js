'use strict';

const tool = require('../core/tool');
const config = require('../config/main.json');
const redis = require('redis');
const redisClient = redis.createClient();

let pub = {};

pub.getImageUrl = async(req, res) => {
    let index = req.params.index;
    redisClient.hget('xhinliang_lofter', index, function(err, replies) {
        if (err) {
            res.send(err);
            return;
        }
        res.send(replies);
    });
}
module.exports = pub;

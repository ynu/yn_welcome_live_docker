var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var moment = require('moment');
var wechat = require('wechat-enterprise');

var sql_string = require('./sql_string');
var utils = require('./utils');
var oracledb = require('oracledb');

var EventProxy = require('eventproxy');
var util = require('util');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var port = process.env.PORT || 9000;

var router = express.Router();

// middleware to use for all requests
router.use(function (req, res, next) {
    //console.log('comming request at ' + moment(Date.now()).format('YYYY-MM-DD h:mm:ss'));
    next();
});

var config = {
    token: process.env.TOKEN,
    encodingAESKey: process.env.AESKEY,
    corpId: process.env.CORPID
};

var connection;
// get database connection
oracledb.getConnection(
    {
        user: process.env.DB_USER,
        password: process.env.PASSWORD,
        connectString: process.env.DB_HOST + '/' + process.env.DB_DATABASE,
    },
    function (err, conn) {
        if (err) {
            console.error(err.message);
            return;
        }
        console.info("established database connection");
        connection = conn;
    });


router.use('/', wechat(config, wechat.event(function (msg, req, res, next) {
    // request country_summary menu
    if (msg.EventKey == "country_summary") {
        connection.execute(
            sql_string.totalSummarySQL,
            [],
            function (err, result) {
                if (err) {
                    console.error(err.message);
                    res.reply(JSON.stringify({message: err.message}));
                    return;
                }
                res.reply(util.format('迎新统计（全国概况）\n\n' +
                    '总人数：%d\n' +
                    '已报到人数：%d\n' +
                    '未报到人数：%d\n' +
                    '报到率：%d\%',
                    result.rows[0][0], result.rows[0][1], result.rows[0][2], Math.round (result.rows[0][3] * 100) / 100));
            });
    }
    // request province_summary of undergraduate menu
    else if (msg.EventKey == "2015本科生迎新") {
        connection.execute(
            sql_string.undergraduateSummarySQL,
            [],
            function (err, result) {
                if (err) {
                    console.error(err.message);
                    res.reply(JSON.stringify({message: err.message}));
                    return;
                }
                var summary = [];
                summary.push("2015本科生迎新\n学院： 总人数/未报到");
                for(i = 0; i < result.rows.length; i++) {
                    summary.push(util.format('%s (%d/%d)\n' +
                        '报到率：%d\%',
                        result.rows[i][0], result.rows[i][1], result.rows[i][2], Math.round (result.rows[i][4] * 100) / 100));
                }
                res.reply(summary.join("\n\n"));
            });
    }
    // request institution_summary of graduate menu
    else if (msg.EventKey == "2015研究生迎新") {
        connection.execute(
            sql_string.graduateSummarySQL,
            [],
            function (err, result) {
                if (err) {
                    console.error(err.message);
                    res.reply(JSON.stringify({message: err.message}));
                    return;
                }
                var summary = [];
                summary.push("2015研究生迎新\n学院： 总人数/未报到");
                for(i = 0; i < result.rows.length; i++) {
                    summary.push(util.format('%s (%d/%d)\n' +
                        '报到率：%d\%',
                        result.rows[i][0], result.rows[i][1], result.rows[i][2], Math.round (result.rows[i][4] * 100) / 100));
                }
                res.reply(summary.join("\n\n"));
            });
    }
})));

// all of our routes will be prefixed with /api
app.use('/api', router);

app.listen(port);
console.log('Magic happens on port ' + port);


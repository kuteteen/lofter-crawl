var spidex = require("spidex");
var path = require("path");
var fs = require("fs");
var URL = require("url");
var redis = require("redis");
var redisClient = redis.createClient();

var base = "download";
var tmpYear = 0;
var tmpMonth = 0;
var tmpIndex = 0;

function saveFile(year, month, filename, buf, url, callback) {
    if (tmpYear != year || tmpMonth != month) {
        tmpIndex = 0;
        tmpYear = year;
        tmpMonth = month;
    } else {
        tmpIndex++;
    }
    var fullname = `${base}/${year}_${month}_${tmpIndex}`;
    fs.writeFile(fullname, buf, {
        encoding: "binary"
    }, callback);
}
var redisIndex = 0;

function saveRedis(year, month, filename, buf, url, callback) {
    redisClient.hset('xhinliang_lofter', ++redisIndex, url, redis.print);
    callback(null);
}

var saveImage = saveFile;
switch (process.argv[1]) {
    case '--file':
        saveImage = saveFile;
        break;
    case '--redis':
        saveImage = saveRedis;
        break;
    case '--all':
    default:
        saveImage = function(year, month, filename, buf, url, callback) {
            saveFile(year, month, filename, buf, url, callback);
            saveRedis(year, month, filename, buf, url, callback);
        };
}


function get(task) {
    var year = task.task.year;
    var month = task.task.month;
    var url = task.task.url;
    var filename = path.basename(url);

    var host = URL.parse(url).hostname;
    spidex.get(url, {
        charset: "binary",
        header: {
            "accept": "image/webp,*/*;q=0.8",
            "accept-language": "zh-CN,zh;q=0.8,en-US;q=0.6,en;q=0.4,sv;q=0.2,zh-TW;q=0.2",
            "cache-control": "max-age=0",
            "connection": "keep-alive",
            "host": host,
            "referer": task.task.referer,
            "user-agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36"
        }
    }, function(html, status) {
        if (status !== 200) {
            console.log("× 抓取图片 [" + filename + "] 失败：服务器返回错误状态码.");

            // 重新push
            task.task.queue.push(task.task, get);
            task.task.queue.taskDone(task);
            return;
        }

        // 如果文件存在就不写了
        if (fs.existsSync(base + year + "/" + month + "/" + filename)) {
            console.log("○ 图片 " + year + month + " [" + filename + "] 存在，不重复抓取。");
            task.task.queue.taskDone(task, true);
            return;
        }

        saveImage(year, month, filename, html, url, function(err) {
            if (err) {
                console.log("× 写入图片 " + year + month + " [" + filename + "] 失败：" + err.message);

                // 重新push
                task.task.queue.push(task.task, get);

                task.task.queue.taskDone(task, true);
                return;
            }

            console.log("√ 写入图片 " + year + month + " [" + filename + "] 成功.");
            task.task.queue.taskDone(task, true);
        });
    }).on("error", function(err) {
        console.log("× 抓取图片 " + year + month + " [" + filename + "] 失败：" + err.message);

        // 重新push
        task.task.queue.push(task.task, get);
        task.task.queue.taskDone(task, true);
    });
}

exports.get = get;

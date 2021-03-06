"use strict";

var url = require('url');
var fs = require('fs');
var path = require('path');

var Utils = require('../../Logic/Utils.js');
var Playlist = require('../../Logic/Playlist.js');
var FileAudio = require('../FileAudio.js');
var IcyAudio = require('../IcyAudio.js');

class FilePlaylist extends Playlist {

    constructor(filePath) {
        super();
        var data = fs.readFileSync(filePath).toString();
        var dir = path.dirname(filePath);
        var lines = data.trim().split("\n");
        if(lines.length == 0) {
            throw new Error('Empty playlist file');
        } else if(startsWith(lines[0], '[playlist]')) {
            this.list = readPLS(lines, dir);
        } else if(startsWith(lines[0], '#EXTM3U')) {
            this.list = readM3U(lines, dir);
        } else {
            this.list = readM3U(lines, dir);
            //throw new Error('Invalid playlist format. Only PLS and M3U are accepted');
        }
        this.lastIndex = -1;
    }

    shuffle() {
        this.shuffleArray(this.list);
    }

    getNextSong() {
        if(this.list.length == 0) return null;
        this.lastIndex++;
        if(this.lastIndex >= this.list.length) this.lastIndex = 0;
        return this.list[this.lastIndex];
    }

    hasNextSong() {
        return this.lastIndex < this.list.length;
    }

    getLength() {
        return this.list.length;
    }

}

function startsWith(str, needle) {
    return str.length >= needle.length && str.substring(0, needle.length) == needle;
}

function createPlayable(path, title, length) {
    var parsed = url.parse(path);
    if(parsed.protocol == null || startsWith(parsed.protocol, 'file')) {
        return new FileAudio(path, title);
    } else if((startsWith(parsed.protocol, 'http') || startsWith(parsed.protocol, 'https')) && length == -1) {
        return new IcyAudio(path);
    } else {
        return new FileAudio(path, title);
    }
}

function readPLS(lines, dir) {
    var data = {
        version: -1,
        numberofentries: 0
    };
    lines.forEach(function(line) {
        if(line.length == 0) return;
        var l = line.split('=');
        if(l.length < 2) return;
        data[l[0].toLowerCase()] = l[1];
    });
    if(data['version'] != 2) {
        throw new Error('Unsupported playlist version');
    } else if(data['numberofentries'] <= 0) {
        throw new Error('Empty playlist');
    }

    var list = [];

    for(var i = 1; i <= data['numberofentries']; i++) {
        if(!Utils.exists(data['file' + i])) continue;
        var length = data['length' + i] === undefined ? -1 : data['length' + i];
        list.push(createPlayable(path.join(dir, data['file' + i]), data['title' + i], length));
    }

    return list;
}

function readM3U(lines, dir) {
    var list = [];
    var title = null, length = -1;
    lines.forEach(function(line) {
        if(line.length == 0) return;
        if(startsWith(line, '#EXTINF:')) {
            var l = line.replace('#EXTINF:', '').split(',');
            length = parseInt(l[0]);
            title = l[1];
        } else if(startsWith(line, '#')) {
            // Ignore, it's a comment
        } else {
            if(!path.isAbsolute(line)) line = path.join(dir, line);
            if(title != null) {
                list.push(createPlayable(line, title, length));
            } else {
                list.push(createPlayable(line, undefined, length));
            }
        }
    });

    return list;
}

module.exports = FilePlaylist;
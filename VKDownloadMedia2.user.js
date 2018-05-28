// ==UserScript==
// @name           Vk Media Downloader
// @description    Скачать музыку, видео с vk.com (ВКонтакте)
// @namespace      https://greasyfork.org/users/136230
// @include        *://vk.com/*
// @include        *://*.vk-cdn.com/*
// @include        *://*.vk-cdn.net/*
// @include        *://*.userapi.com/*
// @include        *://*.vkuseraudio.net/*
// @include        *://*.vkuservideo.net/*
// @version        1.0.1
// @run-at         document-start
// @grant          none
// ==/UserScript==

var DEBUG = false;
var consoleLog = function(){window.console.log.apply(this, arguments);},
    consoleError = function(){window.console.error.apply(this, arguments);},
    blank = function(){},
    cerr = consoleError,
    clog = (DEBUG ? consoleLog : blank);
var clog2 = consoleLog,
    vkDOMAINS = ['vk.com', 'vk-cdn.com', 'vk-cdn.net', 'userapi.com', 'vkuseraudio.net', 'vkuservideo.net'],
    storageKEY = 'vk-domains',
    scriptName = 'Vk Media Downloader',
    scriptVersion = '1.0.1';
(function(window){
    if( window.parent !== window.self )
    {
        clog('[window:child] url: ', location.href);
        clog('[window:child] readyState: ', document.readyState);
        DOMReady(function(){
            var i = executor();
            if( i )
                cerr('[window:child] invalid action, code: ', i, location.origin);
            else
                clog('[window:child] action succeed, code: ', i, location.origin);
        });
    }
    else if(location.hostname === 'vk.com' )
    {
        clog2('[window:parent] start ' + scriptName + ' v' + scriptVersion);
        document.addEventListener('readystatechange', main, false);
    }else{
        clog('[window:parent] origin: ', location.origin);
        clog('[window:parent] script stoped');
    }
})(window);
function DOMReady(callback)
{
    if(!callback) return;
    switch(document.readyState)
    {
    case 'loading':
        document.addEventListener('DOMContentLoaded', callback);
        break;
    case 'interactive':
    case 'complete':
        callback();
        break;
    }
}
function executor()
{
    clog('[executor:document] readyState: ', document.readyState);
    if( window.parent === window.self )
        return 1;
    var s = location.hash, t, r, e;
    var l = ['namespace', 'type', 'media', 'mid', 'id', 'hd', 'fid'];
    if( (t = s.indexOf('#VkMD::')) !== 0 )
        return 2;
    s = s.slice(t + 7);
    try{
        t = JSON.parse(decodeURIComponent(s));
    }catch(er){
        cerr(er);
        return 3;
    }
    if( t.action !== 'request' || t.namespace !== 'VkMD' )
        return 4;
    if( t.id !== undefined )
        t.mid = t.id;
    else if( t.mid !== undefined )
        t.id = t.mid;
    switch(t.type)
    {
    case 'download':
        e = getLoc(t.src, 'pathname').match(/\.([^\.\/]+)$/)[1];
        var a = document.createElement('a');
        a.href = t.src;
        t.name = t.name || (t.md_title + (t.q ? '.' + t.q + 'p': ''));
        a.setAttribute('download', (t.artist ? (t.artist + ' - '): '') + t.name + '.' + e);
        document.body.appendChild(a);
        a.innerHTML = t.name;
        a.click();
        clog('[executor:download] ', a);
        a.parentNode.removeChild(a);
        // making response..
        s = {};
        for( e of l )
        {
            if( t[e] !== undefined )
                s[e] = t[e];
        }
        s.action = 'response';
        s.result = 1;
        s.id = s.mid;
        setTimeout(function(){
            window.parent.postMessage(s, '*');
        }, 200);
        break;
    case 'size':
        if( window.XMLHttpRequest )
            r = new XMLHttpRequest();
        else if( window.ActiveXObject )
            r = new ActiveXObject('Msxml3.XMLHTTP');
        if( !r )
            throw new Error('[iframe:size] can\'t create XMLHttpRequest');
        clog('[executor:size] ', r);
        r.open('HEAD', t.src, !0);
        r._data = {};
        for( e of l )
        {
            if( t[e] !== undefined )
                r._data[e] = t[e];
        }
        r._data.action = 'response';
        r.onload = function(e)
        {
            var t = e.target,
                n = t.getResponseHeader('Content-Length'),
                d = t._data;
            d.result = parseInt(n, 10);
            d.id = d.mid;
            window.parent.postMessage(d, '*');
        };
        r.send();
        break;
    default: return 5;
    }
    return 0;
}
function main(e)
{
    clog('main..', this.readyState);
    switch(this.readyState)
    {
    case 'interactive':
        new Promise(function(f, e){
            window.VkMD = createVkMD();
            f(window.VkMD);
        }).then(function(vkmd){
            window.tooltip = window.tooltip || createTooltip('1');
            return startMediaObserver();
        }).then(function(observer){
            return getId();
        }).then(function(id){
            on$(window, 'message', recieveMessage);
            return createIcon();
        }).then(function(icon){
            return createNewCss(icon);
        }).catch(function(e){
            cerr('[main] error: ', e);
        });
        break;
    case 'complete':
        [].forEach.call($$('.video_item'), function(p){
            video_item(p);
        });
        video_box_wrap(_$('#video_player'));
        break;
    }
}
function startMediaObserver()
{
    var cl0 = ['audio_row__actions', '_audio_row__actions'],
        cl1 = ['video_item', '_video_item'],
        cl2 = 'mv_playlist',
        cl3 = 'mv_info_narrow_column',
        cl4 = 'video_box_wrap';
    var MutationObserver = window.MutationObserver || window.WebkitMutationObserver,
        o = new MutationObserver(function(m, o){
            try{
                for( var n of m )
                {
                    for( var p of n.addedNodes )
                    {
                        if( p.nodeType != 1 )
                            continue;
                        else if( hasClassAll(p, cl0) != -1 ) // 'audio_row__actions'
                            audio_row(p);
                        else if( hasClassAll(p, cl1) != -1 ) // 'video_item'
                            video_item(p);
                        else if( hasClass(p, cl2) ) //'mv_playlist'
                            mv_playlist(p);
                        else if( hasClass(p, cl3) ) //'mv_info_narrow_column'
                            mv_recom(p);
                        else if( p.id && p.id == 'video_player' )
                        {
                            var t = p;
                            setTimeout(function(){
                                video_box_wrap(t);
                            }, 2000);
                        }
                    }
                }
            }catch(err){cerr(err);}
        });
    o.observe(_$('body'), {
        'childList': !0,
        'subtree': !0
    });
    return o;
}
function audio_row(p)
{
    var e = ce$('button', {
        'class': 'audio_row__action _audio_row__action audio_row__download',
        'title': 'Скачать аудиозапись',
    });
    p.appendChild(e);
    tooltip.attach({el: e, option: 'top-right', media: 'audio', shiftY: 5});
    on$(e, 'mouseover', audioSizeRequest);
    on$(e, 'click', audioDownloadRequest );
}
function video_item(p)
{
    var e = se$('<div id="download"><div class="icon icon_download" title="Скачать видеозапись"></div></div>');
    p.classList.add('video_can_download');
    _$('.video_thumb_actions', p).appendChild(e);
    var id = attr$(p, 'data-id');
    attr$(e, 'data-id', id);
    tooltip.attach({el: e, option: 'bottom-right', media: 'video', 'data-id': id});
    on$(e, 'mouseenter', videoSourceRequest);
    on$(e, 'click', stopEvent);
}
function mv_playlist(p)
{
    var l = $$('.mv_playlist_item_thumb', p), e, id;
    for( var el of l )
    {
        e = se$('<div class="mv_playlist_item_download"></div>');
        id = attr$(el.parentNode, 'data-vid');
        attr$(e, {
            'data-id': id,
            'data-media': 'video',
            'title': 'Скачать видеозапись'
        });
        el.appendChild(e);
        tooltip.attach({el: e, option: 'bottom-left', media: 'video', 'data-id': id});
        on$(e, 'mouseenter', videoSourceRequest);
        on$(e, 'click', stopEvent);
    }
}
function mv_recom(p)
{
    var l = $$('.mv_recom_item_thumb', p), e, id;
    for( var el of l )
    {
        e = se$('<div class="mv_recom_item_download"></div>');
        id = el.pathname.replace('/video', '');
        attr$(e, {
            'data-id': id,
            'data-media': 'video',
            'title': 'Скачать видеозапись'
        });
        el.appendChild(e);
        tooltip.attach({el: e, option: 'bottom-left', media: 'video', 'data-id': id});
        on$(e, 'mouseenter', videoSourceRequest);
        on$(e, 'click', stopEvent);
    }
}
function video_box_wrap(p)
{
    var el = _$('.videoplayer_controls', p), e, n, id;
    if( el && !_$('.videoplayer_btn_download', el) )
    {
        e = se$('<div class="videoplayer_controls_item videoplayer_btn videoplayer_btn_download" role="button" tabindex="0"></div>');
        n = _$('.videoplayer_btn_fullscreen', el);
        el.insertBefore(e, n ? n.nextSibling: n);
        id = p.parentNode.id.replace('video_box_wrap', '');
        attr$(e, {
            'data-id': id,
            'data-media': 'video',
        });
        tooltip.attach({el: e, option: 'top-right', media: 'video', 'data-id': id});
        on$(e, 'mouseenter', videoSourceRequest);
        on$(e, 'click', stopEvent);
    }
}
var forEach$ = Array.prototype.forEach;
function hasClassAll(e, l)
{
    for(var i = 0; i < l.length; ++i)
    {
        if( hasClass(e, l[i]) )
            return i;
    }
    return -1;
}
function createNewCss(icon)
{
    var s = css$(`
	.my-test-class,
	.audio_row__download ,
	._audio_row__download {
		background: url(${icon.color('#808080')}) no-repeat !important;
		position: relative;
		top: 5px;
	}
	.video_item.video_can_download #download{
		display: inline-block;
	}
	.my-test-class ,
	.video_thumb_actions .icon.icon_download {
		background: url(${icon.color('#ffffff')}) no-repeat !important;
	}
	.my-test-class ,
	.videoplayer_btn_download {
		background-image: url(${icon.color('#ffffff')});
		background-repeat: no-repeat;
		background-position: 3px;
		border-radius: 3px;
		left: 0;
		bottom: 0;
		z-index: 10;
		width: 18px;
		height: 18px;
		padding: 2px;
		transform: scale(1.1);
	}
	.mv_recom_item_download ,
	.mv_playlist_item_download {
		background-image: url(${icon.color('#ffffff')});
		background-repeat: no-repeat;
		background-color: #000;
		background-position: 3px;
		border-radius: 3px;
		position: absolute;
		left: 0;
		bottom: 0;
		z-index: 10;
		width: 18px;
		height: 18px;
		padding: 2px;
		opacity: 0.7;
	}
	.mv_recom_item_download:hover ,
	.mv_playlist_item_download:hover {
		opacity: 1 !important;
	}
	.media-hd:after{
		content: 'HD';
		padding-left: 3px;
		opacity: 0.7;
	}
	.vkmd-tooltip-section {
		cursor: pointer;
		padding: 5px;
		opacity: 0.8;
	}
	.vkmd-tooltip-section:hover {
		opacity: 1;
		border-style: solid;
		border-width: 1px;
		padding: 4px;
	}
	.vkmd-tooltip-section[data-media="audio"] {
		opacity: 1;
	}
	`);
    s.className = 'my-test-class';
    return s;
}
function recieveMessage(e)
{
    var n = getMessageData(e);
    if( !n )
        return;
    try{
        var t, q, d;
        clog('[recieveMessage] : ', n);
        switch(n.action)
        {
        case 'request':
            t = VkMD[n.media].__get__(n.id);
            switch(n.media)
            {
            case 'audio':
                if( t && t.src )
                {
                    t = extend({}, t, n);
                    t.href = mediaFakePage(t);
                    callExecutor(t.href, t.id, t.type);
                    return t;
                }
                VkMD.audio.__ajax__(n.id).then(function(r){
                    var t = r[0][0];
                    clog('[getAudio:response]: ', t);
                    VkMD.audio.__set__(n.id, t);
                    t = extend({}, t, n);
                    t.href = mediaFakePage(t);
                    callExecutor(t.href, t.id, t.type);
                    return t;
                }).catch(function(er){
                    cerr('error [VkMD.audio:ajax] ', er);
                });
                break;
            case 'video':
                q = VkMD.video.__get__(n.id, n.hd);
                if( q && q.src )
                {
                    q = extend({}, q, n);
                    for(let k of ['md_author', 'md_title', 'oid', 'vid', 'duration'])
                        q[k] = t[k];
                    q.href = mediaFakePage(q);
                    callExecutor(q.href, q.id, q.type + q.hd);
                    return q;
                }
                VkMD.video.__ajax__(n.id).then(function(r){
                    var t = r, q;
                    clog('[getVideo:response]: ', t);
                    VkMD.video.__set__(n.id, t);
                    q = extend({}, q, n);
                    for(let k of ['md_author', 'md_title', 'oid', 'vid', 'duration'])
                        q[k] = t[k];
                    q.href = mediaFakePage(q);
                    callExecutor(q.href, q.id, q.type + q.hd);
                    return q;
                }).catch(function(er){
                    cerr('error [VkMD.video:ajax] ', er);
                });
                break;
            }
            break;
        case 'response':
            switch(n.type)
            {
            case 'size':
                switch(n.media)
                {
                case 'audio':
                    VkMD.audio.__set__(n.id, 'size', n.result);
                    break;
                case 'video':
                    VkMD.video.__set__(n.id, n.hd, 'size', n.result);
                    break;
                }
                d = n.result/(1024*1024);
                tooltip.show();
                break;
            case 'download':
                break;
            default:
                throw new Error('[recieveMessage:response] undefined type of response');
            }
            setTimeout(function(){
                re$(_$('#frame_' + n.type + (n.hd || '') + '_' + n.id));
            }, 5000);
        }
    }catch(er){cerr(er);}
}
function getMessageData(e)
{
    var n, d;
    switch(typeof e.data)
    {
    case 'object':
        if( !e.data.media || !e.data.action || e.data.namespace != 'VkMD' )
            return null;
        n = extend({}, e.data);
        break;
    default:
        cerr('Error [recieveMessage] data: ', e.data);
        return null;
    }
    n.origin = e.origin;
    return n;
}
function callExecutor(url, id, type)
{
    addToList(url);
    return _$('body').appendChild(
        ce$('iframe',
            {src: url,id: 'frame_' + type + '_' + id,},
            {width: '1px',height: '1px',visibility: 'hidden',})
    );
}
var audioSizeRequest = createAudioHandler('size');
var audioDownloadRequest = createAudioHandler('download');
var videoSourceRequest = function(e){
    e.stopPropagation();
    e.preventDefault();
    var t = this,
        id = attr$(t, 'data-id');
    if( !id )
    {
        cerr('[videoSourceRequest] no data-id, element: ', t);
        return;
    }
    var src_req = VkMD.video.__get__(id, 'source_request');
    if( src_req )
        return;
    VkMD.video.__set__(id, 'source_request', true);
    getVideo(id).then(function(r){
        VkMD.video.__set__(id, r);
        tooltip.show();
    }).catch(function(er){
        cerr(er);
    });
};
var stopEvent = function(e){
    e.stopPropagation();
    e.preventDefault();
};
function createAudioHandler(msg)
{
    return function(ev){
        ev.stopPropagation();
        var el = this, fs, id;
        if( this.id )
            id = attr$(this, 'data-id');
        else{
            while( el && !hasClass(el, 'audio_row') )
                el = el.parentNode;
            id = attr$(el, 'data-full-id');
            attr$(this, 'data-id', id);
        }
        if( !VkMD.audio.__get__(id, msg + '_request') )
        {
            try{
                VkMD.audio.__set__(id, msg + '_request', true);
            }catch(err){cerr(err);}
            window.postMessage({
                type: msg,
                media: 'audio',
                id: id,
                namespace: 'VkMD',
                action: 'request',
            }, '*');
        }
        attr$(this, 'title', VkMD.audio.__getText__(id) );
        fs = VkMD.audio.__get__(id, 'size');
    };
}
function extend(e)
{
    e = e || {};
    for( var i = 1; i < arguments.length; ++i )
        if( arguments[i] ) for( var k in arguments[i] )
            if( arguments[i].hasOwnProperty(k) ) e[k] = arguments[i][k];
    return e;
}
function makeRequest(t)
{
    var n = extend({}, {
        method: 'GET',
        url: '/',
        data: null,
        headers: {},
    }, t);
    return new Promise(function(f, e){
        var req, s, k;
        if(typeof n.data == 'object' )
        {
            s = '';
            for(k in n.data)
            {
                if( n.data.hasOwnProperty(k) )
                    s += (k + '=' + n.data[k] + '&');
            }
            n.data = s.length ? s.slice(0, -1) : null;
        }
        if( window.XMLHttpRequest )
            req = new XMLHttpRequest();
        else if( window.ActiveXObject )
        {
            for( s of ['Msxml3.XMLHTTP', 'Msxml2.XMLHTTP.6.0', 'Msxml2.XMLHTTP.3.0'] )
            {
                try{
                    req = new ActiveXObject(s);
                }catch(er){continue;}
            }
            if(!req)
                throw new Error('[makeRequest] can\'t create ActiveXObject');
        }else
            throw new Error('[makeRequest] can\'t create Request');
        req.open(n.method, n.url, !0);
        for(k in n.headers)
        {
            if( n.headers.hasOwnProperty(k) )
                req.setRequestHeader(k, n.headers[k]);
        }
        req.onload = function(response){
            var t = response.target, p;
            clog('[makeRequest:response] status: ', t.status, t.statusText);
            clog('[makeRequest:response] length: ', t.response.length);
            if( t.status == 200 )
                f(t.response);
            else{
                p = new Error(t.statusText);
                p.code = t.status;
                e(p);
            }
        }, req.onerror = function(response){
            e( new Error('[makeRequest:response] network error') );
        }, req.send(n.data);
        clog('[makeRequest] xhr: ', req);
    });
}
function getJSON(t)
{
    return makeRequest(t).then(function(r){
        var result = [], p = r.indexOf('<!json>'), p2, txt;
        while( p != -1 )
        {
            p2 = r.indexOf('<!>', p+7);
            if( p2 == -1 )
                break;
            result.push(JSON.parse(r.slice(p+7, p2)));
            p = r.indexOf('<!json>', p2);
        }
        clog('[getJSON] result.length: ', result.length);
        clog('[getJSON] result: ', result);
        return result;
    });
}
var keys$ = Object.getOwnPropertyNames;
function unmask$(u)
{
    VkMD.uid = window.vkId;
    if( typeof VkMD.audioUnmaskSource !== 'function' )
        createUnmask();
    var t = VkMD.audioUnmaskSource(u);
    return t;
}
	
function getAudioJSON(ids)
{
    return getJSON({
        method: 'POST',
        url: 'https://vk.com/al_audio.php',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
        },
        data: {
            al: 1,
            act: 'reload_audio',
            ids: ids.join(','),
        },
    });
}
function getAudio(ids)
{
    var s = getAudioJSON(ids);
    s.then(function(r){
        var k = r[1] ? parseInt(keys$(r[1])[0], 10) : null;
        if( !k )
            throw new Error('[getAudio:response] vk.id not found');
        r[1] = k;
        return r;
    });
    var l = ['aid', 'oid', 'url', 'name', 'artist', 'duration'];
    ids.forEach(function(e, i){
        s = s.then(function(r){
            window.__textarea__ = window.__textarea__ || ce$('textarea');
            var t = {}, a = r[0][i], k, u;
            for( k = 0; k < l.length; ++k )
            {
                u = l[k];
                __textarea__.innerHTML = a[k];
                t[u] = __textarea__.value;
            }
            t.src = unmask$(t.url);
            t.uid = r[1];
            t.mid = t.oid + '_' + t.aid;
            r[0][i] = t;
            return r;
        });
    });
    return s;
}
function getVideoJSON(id)
{
    return getJSON({
        method: 'POST',
        url: 'https://vk.com/al_video.php',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
        },
        data: {
            act: 'show',
            al: 1,
            al_d: 0,
            autoplay: 0,
            list: '',
            module: '',
            video: id || '',
        },
    });
}
function getVideo(id)
{
    return getVideoJSON(id).then(function(r){
        var o = r[0].player.params[0];
        clog('[getVideo:response] raw data: ', o);
        return o;
    }).catch(function(e){
        cerr('error [getVideo:response]: ', e);
    }).then(function(r){
        var o = {}, k, m;
        const l = ['oid', 'vid', 'viewer_id', 'duration', 'md_title', 'md_author', 'add_hash', 'action_hash', 'embed_hash'];
        for(k of l)
            o[k] = r[k];
        o.quality = [];
        for(k in r)
        {
            if( (m = k.match(/url(\d+)/)) )
            {
                o.quality.push(m[1]);
                o[k] = {
                    src: r[k],
                    q: m[1],
                };
            }
        }
        return o;
    }).then(function(r){
        return r;
    }).catch(function(e){
        cerr('error [getVideo:response]: ', e);
    });
}
function getLoc(u, p)
{
    if( !u )
        return null;
    window.__link__ = window.__link__ || ce$('a');
    __link__.href = u;
    return __link__[p||'href'];
}
function getId()
{
    if( window.vkId )
        return Promise.resolve(window.vkId);
    return getAudio([]).then(function(r){
        clog('[getId] vk.id: ', r[1]);
        return (window.vkId = r[1]);
    }).catch(function(error){
        cerr('[getId] ', error);
    }).then(function(){
        if(window.vkId)
            return window.vkId;
        return new Promise(function(resolve){
            if( window.vk && window.vk.id )
                resolve(window.vkId = window.vk.id);
            else
                DOMReady(function(){
                    var scripts = $$('script:not([src])');
                    for(var i = 0, len = scripts.length, script; i < len; ++i)
                    {
                        script = scripts[i];
                        if( script.innerHTML.indexOf('var vk') != -1 )
                            script.addEventListener('load', function(){
                                if( window.vk && window.vk.id )
                                    resolve(window.vkId = window.vk.id);
                                else
                                    cerr('[getId] WTF!: vk.id not found');
                            });
                    }
                });
        });
    });
}
var map$ = Array.prototype.map;
var slice$ = Array.prototype.slice;
/*
function getAudioId(e){return e.getAttribute('data-full-id');}
function getAllAudio(begin, end)
{
	var audio = $$('.audio_row'),
		len = audio.length,
		audioData = [],
		ids = [], i;
	audio = slice$.call(audio, begin||0, end || len);
	len = audio.length;
	for( i = 0; i < len; i += 10 )
		ids.push(slice$.call(audio, i, i+10).map(getAudioId));
	return ids.reduce(function(s, id, i){
		return s.then(function(){
			return getAudio( id );
		}).then(function(r){
			return (audioData = audioData.concat(r[0]));
		}).catch(function(err){
			cerr("error [getAllAudio]: ids = ", i, id, err);
		});
	}, Promise.resolve(audioData));
}
*/
function mediaFakePage(t)
{
    return t.src.split('?')[0] + '.html#VkMD::' + encodeURIComponent(JSON.stringify(t));
}

function createUnmask()
{
    'use strict';
    function i() {
        return window.wbopen && ~(window.open + '').indexOf('wbopen');
    }
    function o(t) {
        if (!i() && ~t.indexOf('audio_api_unavailable')) {
            var e = t.split('?extra=')[1].split('#'),
                o = '' === e[1] ? '' : a(e[1]);
            if (e = a(e[0]), 'string' != typeof o || !e) return t;
            o = o ? o.split(String.fromCharCode(9)) : [];
            for (var s, r, n = o.length; n--;) {
                if (r = o[n].split(String.fromCharCode(11)), s = r.splice(0, 1, e)[0], !l[s]) return t;
                e = l[s].apply(null, r);
            }
            if (e && 'http' === e.substr(0, 4)) return e;
        }
        return t;
    }
    function a(t) {
        if (!t || t.length % 4 == 1) return !1;
        for (var e, i, o = 0, a = 0, s = ''; i = t.charAt(a++);) i = r.indexOf(i), ~i && (e = o % 4 ? 64 * e + i : i, o++ % 4) && (s += String.fromCharCode(
            255 & e >> (-2 * o & 6)));
        return s;
    }
    function s(t, e) {
        var i = t.length,
            o = [];
        if (i) {
            var a = i;
            for (e = Math.abs(e); a--;) e = (i * (a + 1) ^ e + a) % i, o[a] = e;
        }
        return o;
    }
    VkMD.audioUnmaskSource = o;
    var r = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN0PQRSTUVWXYZO123456789+/=',
        l = {
            v: function(t) {
                return t.split('').reverse().join('');
            },
            r: function(t, e) {
                t = t.split('');
                for (var i, o = r + r, a = t.length; a--;) i = o.indexOf(t[a]), ~i && (t[a] = o.substr(i - e, 1));
                return t.join('');
            },
            s: function(t, e) {
                var i = t.length;
                if (i) {
                    var o = s(t, e),
                        a = 0;
                    for (t = t.split(''); ++a < i;) t[a] = t.splice(o[i - 1 - a], 1, t[a])[0];
                    t = t.join('');
                }
                return t;
            },
            i: function(t, e) {
                return l.s(t, e ^ VkMD.uid);
            },
            x: function(t, e) {
                var i = [];
                return e = e.charCodeAt(0), each(t.split(''), function(t, o) {
                    i.push(String.fromCharCode(o.charCodeAt(0) ^ e));
                }), i.join('');
            }
        };
}

function createVkMD()
{
    var retVal = {
        data: {
            'audio': {
                get time(){return 3e5;},
                ttHtml: getAudioTTHtml,
            },
            'video': {
                get time(){return 6e5;},
                ttHtml: getVideoTTHtml,
            },
            get time(){return 3e5;},
        },
        get audio(){return this.data.audio;},
        get video(){return this.data.video;},
        init: function(){
            Object.defineProperties(this.data.audio, get_properties('audio') );
            Object.defineProperties(this.data.video, get_properties('video') );
        },
    };
    retVal.init();
    return retVal;
}
function ttoverHandler(ev)
{
    ev.preventDefault();
    var t = ev.target;
    if( attr$(t, 'data-media') != 'video' )
        return;
    var q = attr$(t, 'data-quality'),
        id = attr$(t, 'data-id'),
        u = VkMD.video.__get__(id, 'url' + q);
    if( u.size_request )
        return;
    VkMD.video.__set__(id, 'url' + q, 'size_request', true);
    window.postMessage({
        media: 'video',
        action: 'request',
        type: 'size',
        id: id,
        hd: 'url' + q,
        namespace: 'VkMD',
    }, '*');
}
function ttclickHandler(ev)
{
    var t = ev.target;
    if( attr$(t, 'data-media') != 'video' )
        return;
    var q = attr$(t, 'data-quality'),
        id = attr$(t, 'data-id'),
        u = VkMD.video.__get__(id, 'url' + q);
    if( u.download_request )
        return;
    VkMD.video.__set__(id, 'url' + q, 'download_request', true);
    window.postMessage({
        media: 'video',
        action: 'request',
        type: 'download',
        id: id,
        hd: 'url' + q,
        namespace: 'VkMD',
    }, '*');
}
function getAudioTTHtml(key)
{
    var v = this[key], html = 'Cкачать аудиозапись', d, b;
    if( !v || !v.size )
        return html;
    d = v.size;
    b = Math.floor(v.size/(128*v.duration));
    html = '<section class="vkmd-tooltip-section" data-media="audio">Размер файла: ' + (d/(1024*1024)).toFixed(1) + ' MB</section>';
    html += '<section class="vkmd-tooltip-section' + (b && b > 200 ? ' media-hd': '') + '" data-media="audio">Качество: ~' + b + ' kB/s</section>';
    return html;
}
function getVideoTTHtml(key)
{
    var v = this[key], html = '', u, d;
    if( !v || !v.quality )
        return 'Скачать видеозапись';
    for(var k of v.quality)
    {
        k = parseInt(k, 10);
        u = v['url' + k];
        d = u.size || 0;
        html += '' +
		'<section class="vkmd-tooltip-section' + (k > 480 ? ' media-hd': '' ) + '" ' +
			'data-media="video" data-id="' + key + '" data-quality="' + k + '"' +
			'title="' + (v.md_title ? v.md_title : '') + '"' +
		'>' + k + 'p' + (d ? ' (' + (d/(1024*1024)).toFixed(1) + ' MB)': '') + '</section>';
    }
    return html;
}
function get_properties(t)
{
    var f, tt;
    switch(t)
    {
    case 'audio':
        f = function(ids){ return getAudio(ids); };
        tt = 'Скачать аудиозапись';
        break;
    case 'video':
        f = function(id){ return getVideo(id); };
        tt = 'Скачать видеозапись';
        break;
    default:
        throw new Error('[createVkMD:get_properties] invalid key: ' + m);
    }
    return {
        '__ajax__': {
            value: function(ids){
                if(typeof ids === 'string' || ids.length === undefined )
                    ids = [ids];
                return f(ids);
            },
            enumerable: false,
            configurable: true,
        },
        '__get__': {
            value: function(key, key2, key3){
                var v = this[key];
                if( key2 !== undefined && v )
                    v = v[key2];
                if( key3 !== undefined && v )
                    v = v[key3];
                return v;
            },
            enumerable: false,
            configurable: true,
        },
        '__set__': {
            value: function(key, val, val2, val3){
                var v;
                if( !val )
                    return;
                else if(typeof val == 'object')
                {
                    this[key] = extend(this[key], val);
                    this[key]._time = Date.now();
                }else{
                    v = this[key] = this[key] || {};
                    if( val3 === undefined )
                        v[val] = val2;
                    else if( typeof val2 == 'string' )
                    {
                        v = this[key][val] = this[key][val] || {};
                        v[val2] = val3;
                    }
                }
            },
            enumerable: false,
            configurable: true,
        },
        '__outdated__': {
            value: function(key){
                var v = this[key];
                return !v || (Date.now() - v._time) > this.time;
            },
            enumerable: false,
            configurable: true,
        },
        '__getText__': {
            value: function(key){
                var v = this.__get__(key), d;
                if( v && v.size )
                {
                    d = v.size/(1024*1024);
                    return tt + ' (' + d.toFixed(1) + ' MB, ~'
						+ Math.floor(v.size/(v.duration*128)) + ' kB/s)';
                }
                return tt;
            },
            enumerable: false,
            configurable: true,
        },
    };
}
function createIcon()
{
    return {
        index: 824,
        data: 'PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTYuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjE2cHgiIGhlaWdodD0iMTZweCIgdmlld0JveD0iMCAwIDQzMy41IDQzMy41IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA0MzMuNSA0MzMuNTsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8Zz4KCTxnIGlkPSJmaWxlLWRvd25sb2FkIj4KCQk8cGF0aCBkPSJNMzk1LjI1LDE1M2gtMTAyVjBoLTE1M3YxNTNoLTEwMmwxNzguNSwxNzguNUwzOTUuMjUsMTUzeiBNMzguMjUsMzgyLjV2NTFoMzU3di01MUgzOC4yNXoiIGZpbGw9IiM4MDgwODAiLz4KCTwvZz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8Zz4KPC9nPgo8L3N2Zz4K',
        prefix: 'data:image/svg+xml;utf8;base64,',
        color: function(c){
            if( !c || c.length != 7 )
                c = '#808080';
            c = btoa('"' + c + '"');
            return this.prefix + this.data.slice(0, this.index) + c + this.data.slice(this.index + c.length);
        },
    };
}
function on$(n, e, c, b){n.addEventListener(e, c, !!b);}
//function off$(n, e, c, b){n.removeEventListener(e, c, !!b);}
function _$(s, n){return (n||document).querySelector(s);}
function $$(s, n){return (n||document).querySelectorAll(s);}
function e$(s, n){return typeof s == 'string' ? _$(s, n): s;}
//function e$$(s, n){return typeof s == 'string' ? $$(s, n): s;}
function re$(e){if(e && e.parentNode) return e.parentNode.removeChild(e); return e;}
function se$(t){return ce$('div', null, null, t).firstChild;}
function hasClass(e, c){return e.classList.contains(c);}
function ce$(t, a, s, h){
    var e = document.createElement(t), k;
    for(k in a)
        e.setAttribute(k, a[k]);
    for(k in s)
        e.style[k] = s[k];
    e.innerHTML = h || '';
    return e;
}
function attr$(e, a, n)
{
    if( !e )
        return;
    switch(typeof a)
    {
    case 'string':
        switch(typeof n)
        {
        case 'undefined':
            return e.getAttribute(a);
        case 'function':
            e[a] = n;
            break;
        default:
            e.setAttribute(a, n);
        }
        break;
    case 'object':
        for(var k in a)
            attr$(e, k, a[k]);
        break;
    }
}
function css$(cssClass, id)
{
    var s = id ? _$('#' + id) : null;
    if( s )
    {
        s.innerHTML = cssClass;
        return s;
    }else{
        s = ce$('style');
        s.type = 'text/css';
        if(id) s.id = id;
        s.appendChild(document.createTextNode(cssClass));
        return _$('head').appendChild(s);
    }
}
function coords$(element){return e$(element).getBoundingClientRect();}
function documentEl(doc){return (doc||document).documentElement;}
function createTooltip(n)
{
    var retVal = {
        _t: null,
        show: function(t){
            clearTimeout(this.timerId);
            var ttEl = this.ttel;
            if( !t && !this._t) return;
            ttEl.classList.remove('vkmd-hidden');
            t = t || this._t;
            this._t = t;
            ttHTML(ttEl, t);
            setPos(ttEl, t.el, t);
        },
        hide: function(){
            var el = this._t,
                ttEl = this.ttel;
            this.timerId = setTimeout(function(){
                ttEl.classList.add('vkmd-hidden');
            }, 350);
        },
        attach: function(t){
            if( t.attached )
                return;
            var that = this;
            t.mouseenter = t.mouseenter || function(){that.show(t);};
            t.mouseleave = t.mouseleave || function(){that.hide();};
            t.el = e$(t.el);
            on$(t.el, 'mouseenter', t.mouseenter, false);
            on$(t.el, 'mouseleave', t.mouseleave, false);
            t.attached = true;
        },
        /*
		detach: function(t){
			if( !t.attached )
				return;
			t.el = e$(t.el);
			off$(t.el, 'mouseenter', t.mouseenter, false);
			off$(t.el, 'mouseleave', t.mouseleave, false);
			t.mouseenter = null;
			t.mouseleave = null;
			t.attached = false;
		},
		*/
        init: function(id){
            id = 'vkmd-tooltip-' + (id || 0);
            var ttEl = _$('#' + id);
            if( ttEl ) return;
            ttEl = se$('<div id="' + id + '" class="vkmd-tooltip-top vkmd-hidden">' +
				'<div class="vkmd-tooltip-content"></div></div>');
            _$('body').appendChild(ttEl);
            css$(`
			[id^="vkmd-tooltip"] {
				position: fixed;
				z-index: 1000;
				background-color: #000;
				color: #fff;
				opacity: 0.8;
				padding: 5px;
				border-radius: 5px;
				border-color: #d0d0d0;
				border-style: solid;
				border-width: thin;
				min-width: 50px;
				transition: opacity 0.3s;
			}
			.vkmd-hidden {
				/*display: none !important;*/
				opacity: 0;
			}
			`, 'vkmd-tooltip-css');
            this.ttel = ttEl;
            var that = this;
            this.stopTimer = function(evt){clearTimeout(that.timerId);};
            this.dispatchHide = function(evt){that.hide();};
            on$(ttEl, 'click', this.stopTimer, false);
            on$(ttEl, 'mouseenter', this.stopTimer, false);
            on$(ttEl, 'mouseleave', this.dispatchHide, false);
            this.sl = '#' + id;
        },
    };
    retVal.init(n);
    return retVal;
}
function setPosition(tt, el, opt)
{
    var el_crd = coords$(el),
        tt_crd = coords$(tt),
        clientWidth = documentEl().clientWidth,
        clientHeight = documentEl().clientHeight,
        tmp;
    opt.shiftX = opt.shiftX || 0;
    switch(opt.posX)
    {
    case 'left':
        tmp = el_crd.left - (opt.relX == 'inner' ? 0 : tt_crd.width) + opt.shiftX;
        tt.style.left = (tmp < 0 ? 0 : tmp) + 'px';
        break;
    case 'right':
        tmp = el_crd.right - (opt.relX == 'inner' ? tt_crd.width : 0) + opt.shiftX;
        tt.style.left = ((tmp + tt_crd.width) > clientWidth ? clientWidth - tt_crd.width : tmp) + 'px';
        break;
    case 'center':
        tt.style.left = (el_crd.left + (el_crd.width - tt_crd.width)/2 + opt.shiftX) + 'px';
        break;
    }
    opt.shiftY = opt.shiftY || 0;
    switch(opt.posY)
    {
    case 'top':
        tmp = el_crd.top - (opt.relY == 'inner' ? 0 : tt_crd.height) - opt.shiftY;
        tt.style.top = (tmp < 0 ? 0 : tmp) + 'px';
        break;
    case 'bottom':
        tmp = el_crd.bottom - (opt.relY == 'inner' ? tt_crd.height : 0) - opt.shiftY;
        tt.style.top = ((tmp + tt_crd.height) > clientHeight ? clientHeight - tt_crd.height : tmp) + 'px';
        break;
    case 'center':
        tt.style.top = (el_crd.top + (el_crd.height - tt_crd.height)/2 - opt.shiftY) + 'px';
        break;
    }
}
function setPos(tt, el, opt)
{
    if( opt.option )
        opt = extend(opt, getCoordOption(opt.option));
    setPosition(tt, el, opt);
}
function getCoordOption(o)
{
    var opt = {};
    if( o == 'center' )
    {
        opt.posX = 'center';
        opt.posY = 'center';
        return opt;
    }
    // top-left, top-right, bottom-left, bottom-right
    o = o.split('-');
    setCoordOption(opt, 'x', o[1], 'inner');
    setCoordOption(opt, 'y', o[0], 'outer');
    return opt;
}
function setCoordOption(opt, axis, pos, rel)
{
    opt = opt || {};
    switch(axis.toLowerCase())
    {
    case 'x':
        opt.posX = pos;
        opt.relX = rel || '';
        break;
    case 'y':
        opt.posY = pos;
        opt.relY = rel || '';
        break;
    }
}
function ttHTML( tt, t )
{
    var el = _$('.vkmd-tooltip-content', tt);
    if( t && el )
    {
        try{
            el.innerHTML = VkMD[t.media].ttHtml(attr$(t.el, 'data-id'));
            on$( el, 'mouseover', ttoverHandler );
            on$( el, 'click', ttclickHandler );
        }catch(e){
            cerr(e);
            el.innerHTML = 'Error';
        }
    }
}
function addToList(url)
{
    if( location.hostname !== 'vk.com' )
        return -1;
    var origin = getLoc(url, 'origin'),
        hostname = getLoc(url, 'hostname'),
        domain = hostname.split('.').slice(-2).join('.');
    var storage = localStorage.getItem(storageKEY), domains, list;
    try{
        storage = JSON.parse(storage || '{}');
    }catch(e){
        localStorage.removeItem(storageKEY);
        storage = {};
    }
    if( !(domains = storage.domains) )
        domains = storage.domains = [];
    if( !(list = storage[domain]) )
        list = storage[domain] = [];
    if( domains.indexOf(domain) == -1 )
    {
        domains.push(domain);
        clog2('[vkDomainStorage] added new domain: ', domain);
        clog2('[vkDomainStorage] domain list: ', storage.domains);
        if( !localStorage.getItem('vk-warning-off') && vkDOMAINS.indexOf(domain) == -1 )
        {
            var r = confirm('' +
			scriptName + ' v' + scriptVersion + '\r\n' +
			'ВНИМАНИЕ: обнаружен домен, отсутствующий в списке включений\r\n' +
			'Название домена: ' + domain + '\r\n' +
			'Для правильной работы скрипта необходимо добавить его в список включений:\r\n' +
			'// @include\t*://*.' + domain + '/*\r\n' +
			'Больше не показывать это сообщение?');
            if( r )
                localStorage.setItem('vk-warning-off', true);
        }
    }
    if( list.indexOf(origin) == -1 )
    {
        list.push(origin);
        clog2('[vkDomainStorage] added new origin (at:' + domain + '): ', origin);
    }
    localStorage.setItem(storageKEY, JSON.stringify(storage));
    return 0;
}

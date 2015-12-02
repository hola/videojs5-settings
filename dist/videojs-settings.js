(function(window, vjs){
'use strict';
// XXX michaelg remove when vjs5.1 exposes this interface
var vjs_merge = function(obj1, obj2){
    if (!obj2) { return obj1; }
    for (var key in obj2){
        if (Object.prototype.hasOwnProperty.call(obj2, key)) {
            obj1[key] = obj2[key];
        }
    }
    return obj1;
};
var info_overlay, notify_overlay;
var MenuButton = vjs.getComponent('MenuButton');
vjs.registerComponent('SettingsButton', vjs.extend(MenuButton, {
    buttonText: 'Settings',
    className: 'vjs-settings-button',
    createItems: function(){
        this.addClass(this.className);
        var items = [];
        var player = this.player_;
        var opt = this.options();
        if (opt.info)
        {
            opt.info = vjs.mergeOptions({label: 'Technical info'}, opt.info);
            items.push(new InfoButton(player, opt.info));
        }
        if (opt.report)
        {
            opt.report = vjs.mergeOptions({label: 'Report playback issue'},
                opt.report);
            items.push(new ReportButton(player, opt.report));
        }
        var quality = opt.quality;
        var sources = quality && quality.sources ? quality.sources : null;
        if (sources && sources.length>1)
        {
            items.push(new MenuLabel(player, {label: 'Quality'}));
            var item;
            for (var i=0; i<sources.length; i+=1)
            {
                if (!sources[i].src)
                    continue;
                if (!sources[i].label)
                    sources[i].label = sources[i].type;
                item = new QualityButton(player, sources[i]);
                item.addClass('vjs-menu-indent');
                items.push(item);
            }
        }
        return items;
    }
}));
var Component = vjs.getComponent('Component');
vjs.registerComponent('Overlay', vjs.extend(Component, {
    createEl: function(type, props){
        var custom_class = this.options_['class'];
        custom_class = custom_class ? ' '+custom_class : '';
        var proto_component = Component.prototype;
        var container = proto_component.createEl.call(this, 'div', vjs_merge({
            className: 'vjs-info-overlay'+custom_class,
        }, props));
        this.createContent(container);
        return container;
    },
    createContent: function(container){},
}));
function round(val){
    if (typeof val!='number')
        return val;
    return Math.round(val*1000)/1000;
}
var Overlay = vjs.getComponent('Overlay');
vjs.registerComponent('InfoOverlay', vjs.extend(Overlay, {
    info_data: {
        duration: {
            units: 'sec',
            title: 'Duration',
            get: function(p){ return round(p.duration()); },
        },
        position: {
            units: 'sec',
            title: 'Position',
            get: function(p){
                return round(p.currentTime());
            },
        },
        buffered: {
            units: 'sec',
            title: 'Current buffer',
            get: function(p){
                var range = p.buffered();
                var pos = p.currentTime();
                if (range && range.length)
                {
                    for (var i=0; i<range.length; i+=1)
                    {
                        if (range.start(i)<=pos && range.end(i)>=pos)
                            return round(range.end(i)-pos);
                    }
                }
                return '--';
            },
        },
        downloaded: {
            units: 'sec',
            title: 'Downloaded',
            get: function(p){
                var range = p.buffered();
                var buf_sec = 0;
                if (range && range.length)
                {
                    for (var i=0; i<range.length; i+=1)
                        buf_sec += range.end(i)-range.start(i);
                }
                return round(buf_sec);
            },
        },
    },
    createContent: function(container){
        var _this = this;
        var player = this.player_;
        function create_el(el, opt){
            opt = opt ? vjs_merge(opt) : opt;
            var proto_component = Component.prototype;
            return proto_component.createEl.call(_this, el, opt);
        }
        var title = create_el('div', {
            className: 'vjs-info-overlay-title',
            innerHTML: 'Technical info',
        });
        var close_btn = create_el('div', {
            className: 'vjs-info-overlay-x',
            innerHTML: '\u274c',
        });
        close_btn.addEventListener('click', function(evt){
            if (!info_overlay)
                return;
            info_overlay.toggle();
        });
        var content = create_el('div', {
            className: 'vjs-info-overlay-content'});
        var list = create_el('ul', {className: 'vjs-info-overlay-list'});
        var item;
        var title_text;
        for (var i in this.info_data)
        {
            item = create_el('li', {className: 'vjs-info-overlay-list-item'});
            title_text = this.info_data[i].title;
            if (this.info_data[i].units)
                title_text += ' ['+this.info_data[i].units+']';
            title_text += ': ';
            item.appendChild(create_el('strong', {
                innerHTML: title_text}));
            this.info_data[i].el = create_el('span');
            item.appendChild(this.info_data[i].el);
            list.appendChild(item);
        }
        content.appendChild(list);
        container.appendChild(title);
        container.appendChild(close_btn);
        container.appendChild(content);
        this.update();
        player.on('timeupdate', function(){ _this.update(); });
        // force updates when player is paused
        setInterval(function(){ _this.update(); }, 1000);
    },
    update: function(){
        var player = this.player_;
        var info = this.info_data;
        for (var i in info)
            info[i].el.innerHTML = info[i].get(player);
    },
    toggle: function(caller){
        if (caller)
            this.last_caller = caller;
        if (this.visible)
        {
            this.visible = false;
            if (this.last_caller)
                this.last_caller.selected(false);
            this.addClass('vjs-hidden');
            return;
        }
        this.update();
        this.visible = true;
        this.removeClass('vjs-hidden');
    },
}));
vjs.registerComponent('NotifyOverlay', vjs.extend(Overlay, {
    createContent: function(container){
        var _this = this;
        function create_el(el, opt){
            opt = opt ? vjs_merge(opt) : opt;
            var proto_component = Component.prototype;
            return proto_component.createEl.call(_this, el, opt);
        }
        var title = create_el('div', {
            className: 'vjs-notify-overlay-title',
            innerHTML: 'Issue report sent.',
        });
        var content = create_el('div', {
            className: 'vjs-notify-overlay-content',
            innerHTML: 'Thank you!',
        });
        container.appendChild(title);
        container.appendChild(content);
    },
    flash: function(){
        if (this.visible)
            return;
        this.visible = true;
        this.removeClass('vjs-hidden');
        var _this = this;
        setTimeout(function(){
            _this.addClass('vjs-notify-flash');
        }, 50);
        setTimeout(function(){
            _this.visible = false;
            _this.removeClass('vjs-notify-flash');
            _this.addClass('vjs-hidden');
        }, 3500);
    },
}));
var MenuItem = vjs.getComponent('MenuItem');
var ReportButton = vjs.registerComponent('ReportButton', vjs.extend(MenuItem, {
    init: function(player, options){
        MenuItem.call(this, player, options);
        var player_ = player;
        this.on('click', function(){
            // XXX alexeym: make it work without cdn
            player_.trigger({type: 'problem_report'});
            if (!notify_overlay)
                return;
            notify_overlay.flash();
            this.selected(false);
        });
    }
}));
var InfoButton = vjs.registerComponent('InfoButton', vjs.extend(MenuItem, {
    init: function(player, options){
        MenuItem.call(this, player, options);
        this.on('click', function(){
            // XXX alexeym/michaelg: use vjs api to get overlay object
            if (!info_overlay)
                return;
            info_overlay.toggle(this);
        });
    }
}));
var MenuLabel = vjs.registerComponent('MenuLabel', vjs.extend(Component, {
    createEl: function(type, props){
        var prot = Component.prototype;
        return prot.createEl.call(this, 'li', vjs_merge({
            className: 'vjs-menu-item vjs-menu-label',
            innerHTML: this.options_.label,
        }, props));
    },
}));
var QualityButton = vjs.registerComponent('QualityButton',
    vjs.extend(MenuItem, {
    init: function(player, options){
        MenuItem.call(this, player, options);
        this.player_.one('play', vjs.bind(this, this.update));
        this.player_.on('resolutionchange', vjs.bind(this, this.update));
    },
    handleClick: function(){
        var player = this.player_;
        var quality = this.options_;
        // XXX volodymyr: implemented for html5 only, flash requires extra
        // additions, check https://github.com/vidcaster/video-js-resolutions
        if (player.techName_!=='Html5')
            return;
        if (player.cache_.src===quality.src)
        {
            player.trigger('resolutionchange');
            return this; // basically a no-op
        }
        var current_time = player.currentTime();
        var remain_paused = player.paused();
        player.pause();
        player.src(quality.src);
        player.ready(function(){
            player.one('loadeddata', vjs.bind(this, function(){
                this.currentTime(current_time);
            }));
            player.trigger('resolutionchange');
            if (!remain_paused)
            {
                player.load();
                player.play();
            }
        });
    },
    update: function(){
        this.selected(this.player_.cache_.src === this.options_.src);
    },
}));

vjs.plugin('settings_button', function(opt){
    var video = this;
    video.on('ready', function(){
        if (opt.info||opt.report||
            (opt.quality&&opt.quality.sources&&opt.quality.sources.length))
        {
            video.controlBar.addChild('SettingsButton',
                vjs.mergeOptions({}, opt));
        }
        if (opt.info)
        {
            info_overlay = video.addChild('InfoOverlay', {});
            info_overlay.addClass('vjs-hidden');
        }
        if (opt.report)
        {
            notify_overlay = video.addChild('NotifyOverlay',
                {'class': 'vjs-notify-overlay'});
            notify_overlay.addClass('vjs-hidden');
        }
    });
});

}(window, window.videojs));

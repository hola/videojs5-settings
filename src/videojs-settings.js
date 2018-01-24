(function(window, vjs){
'use strict';
require('@hola.org/videojs-utils');
var Clipboard = require('clipboard');
var find = require('lodash/find');
var vtt = require('videojs-vtt.js');
var settings_icon_svg = '<svg viewBox="0 0 36 36">'
    +'<path d="m 23.94,18.78 c .03,-0.25 .05,-0.51 .05,-0.78 0,'
    +'-0.27 -0.02,-0.52 -0.05,-0.78 l 1.68,-1.32 c .15,-0.12 .19,-0.33 .09,'
    +'-0.51 l -1.6,-2.76 c -0.09,-0.17 -0.31,-0.24 -0.48,-0.17 l -1.99,.8 c '
    +'-0.41,-0.32 -0.86,-0.58 -1.35,-0.78 l -0.30,-2.12 c -0.02,-0.19 -0.19,'
    +'-0.33 -0.39,-0.33 l -3.2,0 c -0.2,0 -0.36,.14 -0.39,.33 l -0.30,2.12 c '
    +'-0.48,.2 -0.93,.47 -1.35,.78 l -1.99,-0.8 c -0.18,-0.07 -0.39,0 -0.48,'
    +'.17 l -1.6,2.76 c -0.10,.17 -0.05,.39 .09,.51 l 1.68,1.32 c -0.03,.25 '
    +'-0.05,.52 -0.05,.78 0,.26 .02,.52 .05,.78 l -1.68,1.32 c -0.15,.12 '
    +'-0.19,.33 -0.09,.51 l 1.6,2.76 c .09,.17 .31,.24 .48,.17 l 1.99,-0.8 c '
    +'.41,.32 .86,.58 1.35,.78 l .30,2.12 c .02,.19 .19,.33 .39,.33 l 3.2,0 c '
    +'.2,0 .36,-0.14 .39,-0.33 l .30,-2.12 c .48,-0.2 .93,-0.47 1.35,-0.78 l '
    +'1.99,.8 c .18,.07 .39,0 .48,-0.17 l 1.6,-2.76 c .09,-0.17 .05,-0.39 '
    +'-0.09,-0.51 l -1.68,-1.32 0,0 z m -5.94,2.01 c -1.54,0 -2.8,-1.25 -2.8,'
    +'-2.8 0,-1.54 1.25,-2.8 2.8,-2.8 1.54,0 2.8,1.25 2.8,2.8 0,1.54 -1.25,'
    +'2.8 -2.8,2.8 l 0,0 z"/>'
    +'</svg>';
var captions_icon_svg = '<svg viewBox="-12 -12 72 72">'
    +'<path d="M40 8H8c-2.21 0-4 1.79-4 4v24c0 2.21 1.79 4 4 4h32c2.21 0 '
    +'4-1.79 4-4V12c0-2.21-1.79-4-4-4zM8 24h8v4H8v-4zm20 12H8v-4h20v4zm12 '
    +'0h-8v-4h8v4zm0-8H20v-4h20v4z"/>'
    +'</svg>';
function extend_component(name, parent, comp){
    vjs.registerComponent(name, vjs.extend(vjs.getComponent(parent), comp));
    return vjs.getComponent(name);
}
var Menu = vjs.getComponent('Menu');
extend_component('PopupMenu', 'Menu', {
    className: 'vjs-rightclick-popup',
    popped: false,
    constructor: function(player, options){
        Menu.call(this, player, options);
        var player_ = player;
        this.addClass(this.className);
        this.hide();
        var _this = this;
        var opt = this.options_;
        _this.menuEnabled = true;
        this.addChild(new PoweredBy(player, {label:
            'Powered by Hola Player'}));
        if (opt.copy_url!==false)
        {
            this.addChild(new CopyUrlButton(player, {label: 'Copy video URL',
                url: opt.copy_url}));
        }
        if (opt.copy_url!==false && opt.copy_url_with_time!==false &&
            (!multiple_players()||opt.copy_url))
        {
            this.addChild(new CopyUrlButton(player, {url: opt.copy_url,
                label: 'Copy video URL at current time', time: true}));
        }
        if (opt.embed_code)
        {
            this.addChild(new CopyButton(player, {label: 'Copy embed code',
                text: opt.embed_code}));
        }
        if (opt.debugging)
        {
            this.addChild(new LogButton(player, {label: 'Download log'}));
            this.addChild(
                new CopyLogButton(player, {label: 'Copy debug info'}));
        }
        if (opt.report)
        {
            opt.report = vjs.mergeOptions({label: 'Report playback issue'},
                opt.report);
            this.addChild(new ReportButton(player, opt.report));
        }
        if (opt.info)
        {
            opt.info = vjs.mergeOptions({label: 'Stats for nerds'}, opt.info);
            this.addChild(new InfoButton(player, opt.info));
        }
        if (opt.graph)
        {
            opt.graph = vjs.mergeOptions({label: 'CDN overlay'}, opt.graph);
            this.addChild(new GraphButton(player, opt.graph));
        }
        if (opt.about)
        {
            this.addChild(new MenuItemLink(player, {
                href: 'https://holaspark.com/player',
                label: 'About Hola Player',
            }));
        }
        function get_overflow_parent(el){
            var parent = el;
            while (parent = parent.parentElement)
            {
                if (!parent)
                    return;
                var style = window.getComputedStyle(parent);
                if (style.overflowX!='visible' || style.overflowY!='visible')
                    return parent;
            }
        }
        function oncontextmenu(evt){
            evt.preventDefault();
            if (_this.popped)
                return void _this.hide();
            _this.show();
            _this.check_items();
            var el = _this.el(), x = evt.clientX, y = evt.clientY;
            var max_right = window.innerWidth;
            var max_bottom = window.innerHeight;
            var parent = get_overflow_parent(el);
            if (parent)
            {
                var parent_rect = parent.getBoundingClientRect();
                max_right = Math.min(max_right, parent_rect.right);
                max_bottom = Math.min(max_bottom, parent_rect.bottom);
            }
            var left_shift = x+el.offsetWidth-max_right+5;
            left_shift = Math.max(0, left_shift);
            var top_shift = y+el.offsetHeight-max_bottom+5;
            top_shift = Math.max(0, top_shift);
            var rect = _this.player().el().getBoundingClientRect();
            el.style.left = Math.max(0, x-rect.left-left_shift)+'px';
            el.style.top = Math.max(0, y-rect.top-top_shift)+'px';
        }
        player_.on('contextmenu', oncontextmenu);
        player_.on(['tap', 'click'], function(evt){
            if (_this.popped)
            {
                _this.hide();
                evt.stopPropagation();
                evt.preventDefault();
                return false;
            }
        });
        vjs.on(document, ['tap', 'click'], function(){
            if (_this.popped)
                _this.hide();
        });
        player_.on('hola.wrapper_attached', this.check_items.bind(this));
        player_.on('hola.wrapper_detached', this.check_items.bind(this));
        this.children().forEach(function(item){
            item.on(['tap', 'click'], function(){ _this.hide(); });
        });
        player.enablePopupMenu = function(){
            if (!_this.menuEnabled)
            {
                player_.off('contextmenu');
                player_.on('contextmenu', oncontextmenu);
                _this.menuEnabled = true;
            }
        };
        player.disablePopupMenu = function(){
            if (_this.menuEnabled)
            {
                player_.off('contextmenu');
                player_.on('contextmenu', function(evt){
                    evt.preventDefault(); });
                _this.menuEnabled = false;
            }
        };
    },
    show: function(){
        this.removeClass('vjs-hidden');
        this.popped = true;
    },
    hide: function(){
        this.addClass('vjs-hidden');
        this.popped = false;
    },
    check_items: function(){
        this.children().forEach(function(item){
            if (item.is_visible)
                item.toggleClass('vjs-hidden', !item.is_visible());
        });
    },
});
var SubMenu = extend_component('SubMenu', 'Menu', {
    addToMain: true,
    constructor: function(player, options, parent){
        Menu.call(this, player, options);
        this.items = [];
        this.parent = parent;
        this.createMenuItem();
        this.createTitleItem();
        if (this.className)
            this.addClass(this.className);
        this.update();
    },
    createEl: function(){
        var el = Component.prototype.createEl.call(this, 'div',
            {className: 'vjs-menu-content'});
        el.setAttribute('role', 'menu');
        this.ul = Component.prototype.createEl('ul',
            {className: 'vjs-menu-submenu'});
        el.appendChild(this.ul);
        return el;
    },
    addItem: function(component){
        Menu.prototype.addItem.call(this, component);
        this.ul.appendChild(component.el_);
    },
    createTitleItem: function(){
        if (!this.title)
            return;
        var _this = this;
        var title = new MenuItem(this.player_, {label: this.title});
        title.addClass('vjs-submenu-title');
        title.on(['tap', 'click'], function(){
            _this.parent.back();
        });
        this.addChild(title);
        this.titleItem = title;
    },
    createMenuItem: function(){
        if (!this.title || !this.addToMain)
            return;
        var player = this.player(), _this = this;
        var item = this.menuItem = new MenuItem(player, {label: this.title});
        item.addClass('vjs-menu-item-next');
        var span = vjs.createEl('span', {className: 'vjs-menu-item-content'});
        item.minorLabel = vjs.createEl('span', {className: 'vjs-minor-label'});
        item.contentLabel = vjs.createEl('span');
        span.appendChild(item.contentLabel);
        span.appendChild(item.minorLabel);
        item.el().insertBefore(span, item.el().firstChild);
        item.on(['tap', 'click'], function(){
            _this.parent.next(_this); });
    },
    update: function(){
        var _this = this;
        this.items.forEach(function(item){ _this.removeChild(item); });
        this.items = [];
        if (this.createItems)
            this.createItems();
        this.items.forEach(function(item){
            _this.addChild(item);
            _this.ul.appendChild(item.el_);
            if (_this.handleItemClick)
            {
               item.on(['tap', 'click'], _this.handleItemClick.bind(_this,
                   item));
            }
        });
    },
});
var QualitySubMenu = extend_component('QualitySubMenu', 'SubMenu', {
    className: 'vjs-quality-submenu',
    title: 'Quality',
    constructor: function(player, options, parent){
        var _this = this, tech = player.tech_;
        SubMenu.call(this, player, options, parent);
        this.one(player, 'play', this.updateSelected);
        this.on(player, 'resolutionchange', this.updateSelected);
        this.updateSelected();
        if (tech)
        {
            tech.on('loadedqualitydata', function(e, data){
                _this.updateQuality(data); });
            if (tech.quality_data)
                this.updateQuality(tech.quality_data);
        }
    },
    createItems: function(){
        var player = this.player();
        var quality = this.options_.quality;
        var sources = quality && quality.sources ? quality.sources :
            player.options_.sources;
        if (quality===false || !sources || sources.length<2)
            return void this.menuItem.hide();
        this.menuItem.show();
        for (var i=0; i<sources.length; i++)
        {
            var label = sources[i].label || (sources.length==1 ?
                'Auto' : this.localize('Source')+' '+(i+1));
            var item = new QualityMenuItem(player, vjs.mergeOptions(
                sources[i], {label: label, callback: quality.callback}));
            this.items.push(item);
        }
    },
    handleItemClick: function(item){
        var player = this.player();
        this.parent.settings_button.unpressButton();
        if (item.hasClass('vjs-selected'))
            return;
        var quality = item.options_;
        var level_id = quality.level_id;
        var event, event_name = 'beforeresolutionchange';
        try { event = new window.CustomEvent(event_name); }
        catch(e){
            // XXX stanislav: IE 11 fix
            event = document.createEvent('CustomEvent');
            event.initCustomEvent(event_name, true, true, {});
        }
        player.trigger(event, quality);
        if (event.defaultPrevented)
            return;
        if (level_id!==undefined)
        {
            if (quality.callback)
                quality.callback(level_id);
            player.trigger('resolutionchange');
            return;
        }
        var current_time = player.currentTime();
        var remain_paused = player.paused();
        player.pause();
        player.src(quality.src);
        player.ready(function(){
            seek(player, current_time);
            player.trigger('resolutionchange');
            if (!remain_paused)
            {
                player.load();
                player.play();
            }
        });
    },
    updateSelected: function(){
        var _this = this;
        var player = this.player_;
        var current_src = player.cache_.src;
        var hola = window.hola_cdn;
        var wrapper = hola && hola.wrapper && find(hola.wrapper, function(w){
            return w.player && w.player.vjs==player;
        });
        // in case of hola_cdn attached get origin video url instead of blob
        if (wrapper && wrapper.player)
            current_src = wrapper.player.get_url();
        var items = this.items, selected_label;
        items.forEach(function(item){
            var selected = item.options_.src ?
                cmp_url(item.options_.src, current_src) :
                item.options_.level_id==_this.selectedLevel;
            item.selected(selected);
            if (selected)
                selected_label = item.options_.label;
        });
        var current_label;
        if (this.selectedLevel==-1 && this.currentLevel!==undefined)
        {
            var levels = (this.options_.quality||{}).sources||[];
            var cur = find(levels, function(l){
                return l.level_id==_this.currentLevel; });
            current_label = cur ? cur.label : '';
        }
        var type = quality_type(current_label || selected_label);
        this.menuItem.contentLabel.innerHTML =
            this.localize(selected_label)||'';
        this.menuItem.minorLabel.innerHTML = this.localize(current_label)||'';
        this.menuItem.toggleClass('vjs-quality-hd', type=='hd');
        this.menuItem.toggleClass('vjs-quality-4k', type=='4k');
        this.parent.settings_button.toggleClass('vjs-quality-hd', type=='hd');
        this.parent.settings_button.toggleClass('vjs-quality-4k', type=='4k');
    },
    levelsChanged: function(levels){
        var current = (this.options_.quality||{}).sources||[];
        if (current.length!=levels.length)
            return true;
        for (var i=0; i<levels.length; i++)
        {
            if (current[i].level_id!=levels[i].id)
                return true;
        }
        return false;
    },
    updateQuality: function(data){
        var sources = [];
        var callback = data.callback;
        var levels = data.quality.list.slice().sort(function(a, b){
            return b.id==-1 ? -1 : a.id==-1 ? 1 : b.bitrate-a.bitrate; });
        this.selectedLevel = data.quality.selected;
        this.currentLevel = data.quality.current;
        var quality = this.options_.quality = this.options_.quality||{};
        if (this.levelsChanged(levels) || callback!=quality.callback)
        {
            levels.forEach(function(item){
                sources.push({level_id: item.id, label: item.label});
            });
            quality.sources = sources;
            quality.callback = callback;
            this.update();
        }
        this.updateSelected();
    }
});
function quality_type(label){
    var m = label && label.match(/(\d+)p/);
    var q = m && parseInt(m[1], 10);
    return q>=2160 ? '4k' : q>=720 ? 'hd' : null;
}
function is_hls_provider(player){
    // XXX bahaa/alexeym: make it an opt instead of detecting provider
    return player.tech_ && (player.tech_.flashlsProvider ||
        player.tech_.hlsProvider);
}
var QualityMenuItem = extend_component('QualityMenuItem', 'MenuItem', {
    constructor: function(player, options){
        options = vjs.mergeOptions({selectable: true}, options);
        MenuItem.call(this, player, options);
        var qt;
        if (qt = quality_type(options.label))
            this.addClass('vjs-quality-'+qt);
        if (options['default'])
            this.player_.src(options.src);
    },
    handleClick: function(){},
});
var SpeedSubMenu = extend_component('SpeedSubMenu', 'SubMenu', {
    className: 'vjs-speed-submenu',
    title: 'Speed',
    values: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
    constructor: function(player, options, parent){
        this.supported = player.tech_ && player.tech_.featuresPlaybackRate;
        SubMenu.call(this, player, options, parent);
        this.on(player, 'ratechange', this.handleRateChange);
        var rate = parseFloat(local_storage_get('vjs5_speed'));
        if (this.supported && this.values.indexOf(rate)!=-1)
            player.playbackRate(rate);
        this.handleRateChange();
    },
    createItems: function(){
        var _this = this, player = this.player();
        var rates = this.supported ? this.values : [1];
        rates.forEach(function(rate){
            var item = new MenuItem(player, {
                label: rate==1 ? 'Normal' : rate,
                selectable: true,
                rate: rate,
            });
            _this.items.push(item);
        });
    },
    handleItemClick: function(item){
        var player = this.player(), rate = item.options_.rate;
        this.parent.back();
        if (rate!=player.playbackRate())
            player.playbackRate(rate);
        local_storage_set('vjs5_speed', rate);
    },
    handleRateChange: function(){
        var rate = this.player().playbackRate();
        this.menuItem.contentLabel.innerHTML = rate==1 ?
            this.localize('Normal') : rate;
        this.items.forEach(function(item){
            item.selected(item.options_.rate==rate);
        });
    },
});
function get_captions_tracks(player){
    var tracks = [];
    var tt = player.textTracks();
    if (!tt || !tt.length)
        return tracks;
    for (var i=0; i<tt.length; i++)
    {
        if (tt[i].kind=='subtitles' || tt[i].kind=='captions')
            tracks.push(tt[i]);
    }
    return tracks;
}
function get_track_label(track){
    return track ? track.label||track.language||track.kind : 'Off';
}
var CaptionsSubMenu = extend_component('CaptionsSubMenu', 'SubMenu', {
    className: 'vjs-captions-submenu',
    title: 'Subtitles/CC',
    constructor: function(player, options, parent){
        SubMenu.call(this, player, options, parent);
        var tt = player.textTracks();
        if (!tt || !tt.on)
            return;
        this.optionsMenu = new CaptionsOptionsMenu(player, options, parent);
        this.parent.addSubMenu(this.optionsMenu);
        var opt_el = vjs.createEl('div', {className: 'vjs-minor-label',
            innerHTML: this.localize('Options')});
        this.titleItem.el().appendChild(opt_el);
        this.on(opt_el, ['touchstart', 'touchend', 'click'], function(event){
            event.preventDefault();
            event.stopPropagation();
            if (event.type=='click' || event.type=='touchend')
                parent.next(this.optionsMenu);
        });
        this.on(tt, 'addtrack', this.update);
        this.on(tt, 'removetrack', this.update);
        this.on(tt, 'change', this.handleTrackChange);
    },
    createItems: function(){
        var player = this.player();
        var tracks = get_captions_tracks(player);
        if (!tracks.length)
            return void this.menuItem.hide();
        this.menuItem.show();
        for (var i=-1; i<tracks.length; i++)
        {
            var track = tracks[i];
            var item = new MenuItem(player, {
                label: get_track_label(track),
                selectable: true,
                track: track,
            });
            this.items.push(item);
        }
        this.handleTrackChange();
    },
    handleItemClick: function(item){
        var player = this.player();
        var tt = player.textTracks();
        for (var i=0; i<tt.length; i++)
            tt[i].mode = tt[i]==item.options_.track ? 'showing' : 'disabled';
        this.parent.back();
        this.handleTrackChange();
    },
    handleTrackChange: function(){
        var selected = find(this.items, function(item){
            return item.options_.track && item.options_.track.mode=='showing';
        }) || find(this.items, function(item){ return !item.options_track; });
        this.items.forEach(function(item){ item.selected(item==selected); });
        this.menuItem.contentLabel.innerHTML =
            selected ? selected.options_.label : '';
    },
});
var CaptionsOptionsMenu = extend_component('CaptionsOptionsMenu', 'SubMenu', {
    className: 'vjs-captions-options-submenu',
    title: 'Options',
    addToMain: false,
    dict: {
        font: [
            {value: 'monospaceSerif', text: 'Monospace Serif'},
            {value: 'proportionalSerif', text: 'Proportional Serif'},
            {value: 'monospaceSansSerif', text: 'Monospace Sans-Serif'},
            {value: 'proportionalSansSerif', text: 'Proportional Sans-Serif'},
            {value: 'casual', text: 'Casual'},
            {value: 'script', text: 'Script'},
            {value: 'smallcaps', text: 'Small Caps'}
        ],
        size: [
            {value: '0.50', text: '50%'},
            {value: '0.75', text: '75%'},
            {value: '1.00', text: '100%'},
            {value: '1.50', text: '150%'},
            {value: '2.00', text: '200%'},
            {value: '3.00', text: '300%'},
            {value: '4.00', text: '400%'}
        ],
        opacity: [
            {value: '0.00', text: '0%'},
            {value: '0.25', text: '25%'},
            {value: '0.50', text: '50%'},
            {value: '0.75', text: '75%'},
            {value: '1.00', text: '100%'}
        ],
        color: [
            {value: '#FFF', text: 'White'},
            {value: '#000', text: 'Black'},
            {value: '#F00', text: 'Red'},
            {value: '#0F0', text: 'Green'},
            {value: '#00F', text: 'Blue'},
            {value: '#FF0', text: 'Yellow'},
            {value: '#F0F', text: 'Magenta'},
            {value: '#0FF', text: 'Cyan'}
        ],
        edge: [
            {value: 'none', text: 'None'},
            {value: 'raised', text: 'Raised'},
            {value: 'depressed', text: 'Depressed'},
            {value: 'uniform', text: 'Uniform'},
            {value: 'dropshadow', text: 'Drop shadow'}
        ],
    },
    constructor: function(player, options, parent){
        var d = this.dict;
        this.params = [
            {key: 'fontFamily', text: 'Font family', dict: d.font, def: 3},
            {key: 'color', text: 'Font color', dict: d.color, def: 0},
            {key: 'fontPercent', text: 'Font size', dict: d.size, def: 2},
            {key: 'textOpacity', text: 'Font opacity', dict: d.opacity,
                def: 4},
            {key: 'backgroundColor', text: 'Background color', dict: d.color,
                def: 1},
            {key: 'backgroundOpacity', text: 'Background opacity',
                dict: d.opacity, def: 3},
            {key: 'windowColor', text: 'Window color', dict: d.color, def: 1},
            {key: 'windowOpacity', text: 'Window opacity', dict: d.opacity,
                def: 0},
            {key: 'edgeStyle', text: 'Text edge style', dict: d.edge, def: 0}
        ];
        this.reset();
        this.load();
        SubMenu.call(this, player, options, parent);
        this.selectMenu = new SelectValueMenu(player, options, parent);
        this.on(this.selectMenu, 'selected', this.handleValueChange);
        this.parent.addSubMenu(this.selectMenu);
        var orig = player.getChild('textTrackSettings');
        player.removeChild(orig);
        orig.dispose();
        player.textTrackSettings = this;
    },
    save: function(){
        local_storage_set('vjs5_captions_options',
            JSON.stringify(this.getValues()));
    },
    load: function(){
        var values;
        try {
            values = JSON.parse(local_storage_get('vjs5_captions_options'));
        } catch(e){}
        if (!values)
            return;
        this.params.forEach(function(p){
            var value = find(p.dict, function(d){
                return d.value==values[p.key];
            });
            if (value)
                p.value = value;
        });
    },
    reset: function(){
        this.params.forEach(function(p){ p.value = p.dict[p.def]; });
    },
    getValues: function(){
        var res = {};
        this.params.forEach(function(p){ res[p.key] = p.value.value; });
        return res;
    },
    createItems: function(){
        var player = this.player, items = this.items;
        this.params.forEach(function(p){
            var item = new MenuItem(player, {label: p.text});
            item.param = p;
            item.addClass('vjs-menu-item-next');
            var span = vjs.createEl('span', {
                className: 'vjs-menu-item-content',
                innerHTML: item.localize(p.value.text),
            });
            item.contentLabel = span;
            item.el().insertBefore(span, item.el().firstChild);
            items.push(item);
        });
        items.push(new MenuItem(player, {label: 'Reset', reset: true}));
    },
    handleItemClick: function(item){
        if (item.options_.reset)
        {
            this.reset();
            this.update();
            this.changed();
            return;
        }
        this.currentItem = item;
        var p = item.param;
        this.selectMenu.show({title: p.text, dict: p.dict, selected: p.value});
    },
    handleValueChange: function(event, value){
        this.currentItem.param.value = value;
        this.currentItem.contentLabel.innerHTML = value.text;
        this.changed();
    },
    changed: function(){
        this.save();
        var d = this.player().textTrackDisplay;
        d.updateDisplay();
        if (this.timeout)
            this.clearTimeout(this.timeout);
        if (d.el().textContent)
            return;
        var text = this.localize('Subtitles will look like this');
        var fake_track = {activeCues: [new vtt.VTTCue(0, 0, text)]};
        d.updateForTrack(fake_track);
        this.timeout = this.setTimeout(function(){ d.updateDisplay(); }, 3000);
    },
});
var SelectValueMenu = extend_component('SelectValueMenu', 'SubMenu', {
    className: 'vjs-select-value-submenu',
    addToMain: false,
    dict: [],
    show: function(opt){
        this.title = opt.title;
        if (this.titleItem)
            this.removeChild(this.titleItem);
        this.createTitleItem();
        this.dict = opt.dict;
        this.update();
        this.items.forEach(function(item){
            item.selected(item.value==opt.selected);
        });
        this.parent.next(this);
    },
    createItems: function(){
        var items = this.items, player = this.player();
        this.dict.forEach(function(d){
            var item = new MenuItem(player, {label: d.text, selectable: true});
            item.value = d;
            items.push(item);
        });
    },
    handleItemClick: function(item){
        this.trigger('selected', item.value);
        this.items.forEach(function(i){ i.selected(i==item); });
    },
});
var get_ui_zoom = function(player){
    var scale = 1;
    if (player&&!player.hasClass('vjs-ios-skin'))
        return scale;
    var orientation = window.orientation;
    if (orientation!==undefined)
    {
        orientation = orientation===90||orientation==-90 ? 'horizontal' :
            'vertical';
    }
    var screen = window.screen;
    if (!orientation||!screen)
        return scale;
    var width_available = orientation=='vertical' ? screen.availWidth :
        screen.availHeight;
    if (width_available)
        scale = window.innerWidth/width_available;
    return scale;
};
var SettingsMenu = extend_component('SettingsMenu', 'Menu', {
    className: 'vjs-settings-menu',
    history: [],
    constructor: function(player, options, settings_button){
        Menu.call(this, player, options);
        this.settings_button = settings_button;
        this.addClass(this.className);
        this.update();
        this.on(['tap', 'click', 'touchstart', 'touchend'], function(event){
            event.stopPropagation();
        });
        var resize = this._resize = this.resize.bind(this);
        player.on('resize', resize);
        player.on('fullscreenchange', function(){ setTimeout(resize); });
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', resize);
    },
    dispose: function(){
        window.removeEventListener('resize', this._resize);
        window.removeEventListener('orientationchange', this._resize);
        Menu.prototype.dispose.call(this);
    },
    createEl: function(){
        var el = Component.prototype.createEl.call(this, 'div',
            {className: 'vjs-menu'});
        el.setAttribute('role', 'presentation');
        el.style.zoom = get_ui_zoom(this.player_);
        return el;
    },
    update: function(){
        this.children().forEach(this.removeChild.bind(this));
        this.createItems();
    },
    addSubMenu: function(menu){
        this.addChild(menu);
        if (menu.menuItem)
        {
            this.mainMenu.addChild(menu.menuItem);
            this.mainMenu.ul.appendChild(menu.menuItem.el_);
        }
    },
    createItems: function(){
        this.mainMenu = new SubMenu(this.player_, this.options_, this);
        this.mainMenu.addClass('vjs-main-submenu');
        this.addChild(this.mainMenu);
        var menus = [SpeedSubMenu, CaptionsSubMenu, QualitySubMenu];
        for (var i=0; i<menus.length; i++)
            this.addSubMenu(new menus[i](this.player_, this.options_, this));
        this.selectMain(true);
    },
    selectMain: function(no_transition){
        this.history = [];
        this.setActive(this.mainMenu, no_transition);
    },
    show: function(visible){
        if (visible)
        {
            this.el_.style.height = '';
            this.el_.style.width = '';
            this.selectMain(true);
            this.addClass('vjs-lock-showing');
            return;
        }
        var _this = this;
        this.el_.style.opacity = '0';
        this.setTimeout(function(){
            this.el_.style.opacity = '';
            _this.removeClass('vjs-lock-showing');
        }, 100);
    },
    getSize: function(el){
        el = el||this.el_;
        return {width: el.offsetWidth, height: el.offsetHeight};
    },
    setSize: function(size){
        this.el_.style.height = size ? size.height+'px' : '';
        this.el_.style.width = size ? size.width+'px' : '';
    },
    resize: function(){
        var ui_zoom = get_ui_zoom(this.player_);
        this.el_.style.zoom = ui_zoom;
        if (this.active)
            this.setActive(this.active);
    },
    setActive: function(menu, no_transition){
        if (!no_transition && window.requestAnimationFrame)
        {
            var menu_el = menu.el();
            var ui_zoom = get_ui_zoom(this.player_);
            this.el_.style.zoom = ui_zoom;
            var title_offset = menu.titleItem ?
                this.getSize(menu.titleItem.el_).height : 0;
            var offset = 100/ui_zoom+(ui_zoom>1 ? 15 : 0)+title_offset;
            var max_height = (this.player().el().offsetHeight)/ui_zoom - offset;
            menu.ul.style.maxHeight = max_height+'px';
            var _this = this, new_size = this.getSize(menu_el);
            this.setSize(this.getSize());
            window.requestAnimationFrame(function(){
                _this.addClass('vjs-size-transition');
                window.requestAnimationFrame(function(){
                    var on_end = function(){
                        _this.removeClass('vjs-size-transition');
                        _this.setSize();
                        _this.clearTimeout(timeout);
                    };
                    _this.setSize(new_size);
                    _this.one('transitionend', on_end);
                    var timeout = _this.setTimeout(on_end, 300);
                });
            });
        }
        this.active = menu;
        this.children().forEach(function(item){
            item.toggleClass('vjs-active-submenu', item==menu);
        });
    },
    next: function(menu){
        this.history.push(this.active);
        this.setActive(menu);
    },
    back: function(){
        this.setActive(this.history.pop() || this.mainMenu);
    }
});
var MenuButton = vjs.getComponent('MenuButton');
extend_component('SettingsButton', 'MenuButton', {
    controlText_: 'Settings',
    update: function(){
        var player = this.player_;
        var menu = new SettingsMenu(player, this.options_, this);
        if (this.menu)
            player.removeChild(this.menu);
        this.menu = menu;
        player.addChild(menu);
        this.buttonPressed_ = false;
        this.el_.setAttribute('aria-expanded', 'false');
        if (this.items && !this.items.length)
            this.hide();
        else if (this.items && this.items.length>1)
            this.show();
    },
    createEl: function(){
        var el = MenuButton.prototype.createEl.call(this);
        this.icon_ = vjs.createEl('div', {className: 'vjs-button-icon',
            innerHTML: settings_icon_svg});
        el.insertBefore(this.icon_, el.firstChild);
        return el;
    },
    buildCSSClass: function(){
        return MenuButton.prototype.buildCSSClass.call(this)+
            ' vjs-settings-button';
    },
    handleClick: function(){
        if (this.buttonPressed_)
            this.unpressButton();
        else
            this.pressButton();
    },
    updateState: function(){
        this.player_.toggleClass('vjs-settings-expanded', this.buttonPressed_);
        this.el_.setAttribute('aria-expanded', this.buttonPressed_);
        this.menu.show(this.buttonPressed_);
    },
    unpressButton: function(){
        if (!this.enabled_)
            return;
        this.buttonPressed_ = false;
        this.updateState();
        this.el_.focus();
        this.clearInterval(this.activityInterval);
        if (this.clickListener)
        {
            vjs.off(document, ['tap', 'click'], this.clickListener);
            this.player_.off(['tap', 'click'], this.clickListener);
            this.clickListener = null;
        }
    },
    pressButton: function(){
        if (!this.enabled_)
            return;
        this.buttonPressed_ = true;
        this.updateState();
        this.menu.focus();
        // prevent setting vjs-user-inactive when menu is opened
        this.activityInterval = this.setInterval(
            this.player_.reportUserActivity.bind(this.player_), 250);
        var _this = this;
        this.setTimeout(function(){
            _this.clickListener = _this.unpressButton.bind(_this);
            vjs.on(document, ['tap', 'click'], this.clickListener);
            _this.player_.on(['tap', 'click'], this.clickListener);
        });
    },
    tooltipHandler: function(){
        return this.icon_;
    },
});
var Component = vjs.getComponent('Component');
var Overlay = extend_component('Overlay', 'Component', {
    constructor: function(player, options){
        Component.call(this, player, options);
        this.hide();
    },
    createEl: function(type, props){
        var custom_class = this.options_['class'];
        custom_class = custom_class ? ' '+custom_class : '';
        var proto_component = Component.prototype;
        var container = proto_component.createEl.call(this, 'div',
            vjs.mergeOptions({className: 'vjs-info-overlay'+custom_class},
            props));
        this.createContent(container);
        return container;
    },
    createContent: function(){},
});
function round(val){
    if (typeof val!='number')
        return val;
    return val.toFixed(3);
}
function is_wrapper_attached(check_bws){
    var hola = window.hola_cdn;
    return hola && hola.get_wrapper() && (!check_bws || !!hola._get_bws());
}
extend_component('InfoOverlay', 'Overlay', {
    constructor: function(player, options){
        this.info_data = {
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
                        for (var i=0; i<range.length; i++)
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
                        for (var i=0; i<range.length; i++)
                            buf_sec += range.end(i)-range.start(i);
                    }
                    return round(buf_sec);
                },
            },
        };
        Overlay.call(this, player, options);
    },
    createContent: function(container){
        var _this = this;
        var player = this.player_;
        function create_el(el, opt){
            opt = opt ? vjs.mergeOptions(opt) : opt;
            var proto_component = Component.prototype;
            return proto_component.createEl.call(_this, el, opt);
        }
        var title = create_el('div', {
            className: 'vjs-info-overlay-title',
            innerHTML: this.localize('Technical info'),
        });
        var close_btn = create_el('div', {className: 'vjs-info-overlay-x'});
        var close = this.toggle.bind(this, null, true);
        close_btn.addEventListener('click', close);
        close_btn.addEventListener('touchend', close);
        var content = create_el('div', {
            className: 'vjs-info-overlay-content'});
        var list = create_el('ul', {className: 'vjs-info-overlay-list'});
        var item;
        var title_text;
        for (var i in this.info_data)
        {
            item = create_el('li', {className: 'vjs-info-overlay-list-item'});
            title_text = this.localize(this.info_data[i].title);
            if (this.info_data[i].units)
                title_text += ' ['+this.localize(this.info_data[i].units)+']';
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
        this.updateInterval = setInterval(function(){ _this.update(); }, 1000);
    },
    update: function(){
        var player = this.player_;
        var info = this.info_data;
        for (var i in info)
            info[i].el.innerHTML = info[i].get(player);
    },
    toggle: function(caller, hide){
        if (caller)
            this.last_caller = caller;
        if (this.visible||hide)
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
    dispose: function(){
        clearInterval(this.updateInterval);
        Overlay.prototype.dispose.call(this);
    },
});
extend_component('NotifyOverlay', 'Overlay', {
    constructor: function(player, options){
        Overlay.call(this, player, options);
        this.addClass('vjs-notify-overlay');
    },
    createContent: function(container){
        var _this = this;
        function create_el(el, opt){
            opt = opt ? vjs.mergeOptions(opt) : opt;
            var proto_component = Component.prototype;
            return proto_component.createEl.call(_this, el, opt);
        }
        var title = create_el('div', {
            className: 'vjs-notify-overlay-title',
            innerHTML: this.localize('Issue report sent'),
        });
        var content = create_el('div', {
            className: 'vjs-notify-overlay-content',
            innerHTML: this.localize('Thank you!'),
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
});
var ClickableComponent = vjs.getComponent('ClickableComponent');
var MenuItem = vjs.getComponent('MenuItem');
MenuItem.prototype.createEl = function(type, props, attrs){
    props = Object.assign({
        className: 'vjs-menu-item',
        innerHTML: '<span class="vjs-menu-item-label">'+
            this.localize(this.options_.label)+'</span>',
        tabIndex: -1,
    }, props);
    return ClickableComponent.prototype.createEl('li', props, attrs);
};
var PoweredBy = extend_component('PoweredBy', 'MenuItem', {
    constructor: function(player, options){
        var ver = window.hola_player&&window.hola_player.VERSION;
        if (ver)
            options.label += ' '+ver;
        MenuItem.call(this, player, options);
        this.addClass('vjs-powered-by');
    },
});
var MenuItemLink = extend_component('MenuItemLink', 'MenuItem', {
    createEl: function(type, props){
        var prot = MenuItem.prototype;
        var label = this.localize(this.options_.label);
        var el = prot.createEl.call(this, 'li', vjs.mergeOptions({
            className: 'vjs-menu-item vjs-menu-item-link',
            innerHTML: '',
        }, props));
        this.link = Component.prototype.createEl('a', {
            className: 'vjs-menu-link',
            innerHTML: this.localize(label),
        }, {
            target: '_blank',
            href: this.options_.href||'#',
        });
        el.appendChild(this.link);
        this.link.addEventListener('touchstart', function(e){
            e.stopPropagation(); });
        return el;
    },
    handleClick: function(e){ e.stopPropagation(); },
});
var ReportButton = extend_component('ReportButton', 'MenuItem', {
    is_visible: is_wrapper_attached,
    handleClick: function(){
        this.player_.trigger({type: 'problem_report'});
        var overlay;
        if (overlay = this.player_.getChild('NotifyOverlay'))
            overlay.flash();
        this.selected(false);
    },
});
var LogButton = extend_component('LogButton', 'MenuItem', {
    is_visible: is_wrapper_attached,
    handleClick: function(){
        this.player_.trigger({type: 'save_logs'});
        this.selected(false);
    },
});
var GraphButton = extend_component('GraphButton', 'MenuItem', {
    is_visible: is_wrapper_attached.bind(null, true),
    handleClick: function(){
        this.player_.trigger({type: 'cdn_graph_overlay'});
        this.selected(false);
    },
});
var CopyButton = extend_component('CopyButton', 'MenuItem', {
    constructor: function(player, options){
        MenuItem.call(this, player, options);
        this.clipboard = new Clipboard(this.el_, {
            text: this.getText.bind(this),
        });
        this.on('tap', function(e){
            this.clipboard.onClick({currentTarget: e.target});
        });
    },
    getText: function(){
        return this.options_.text;
    },
    dispose: function(){
        this.clipboard.destroy();
        MenuItem.prototype.dispose.call(this);
    },
});
var CopyLogButton = extend_component('CopyLogButton', 'CopyButton', {
    getText: function(){
        var player = this.player();
        if (!player.hola_logs)
            return 'Can\'t find hola_logs method!';
        return player.hola_logs();
    },
    is_visible: is_wrapper_attached,
});
var CopyUrlButton = extend_component('CopyUrlButton', 'CopyButton', {
    getText: function(){
        var url = this.options_.url || get_top_url();
        if (this.options_.time)
        {
            var pos = Math.floor(this.player().currentTime());
            var re = /(#(?:.*&)?t=)(\d*)/;
            if (url.match(re))
                url = url.replace(re, '$1'+pos);
            else
                url += (url.indexOf('#')!=-1 ? '&t=' : '#t=')+pos;
        }
        return url;
    },
});
var InfoButton = extend_component('InfoButton', 'MenuItem', {
    handleClick: function(){
        var overlay;
        if (overlay = this.player_.getChild('InfoOverlay'))
            overlay.toggle(this);
    },
});
var Button = vjs.getComponent('Button');
extend_component('CaptionsToggle', 'Button', {
    controlText_: 'Subtitles/closed captions',
    constructor: function(player, options){
        Button.call(this, player, options);
        this.addClass('vjs-captions-toggle');
        this.hide();
        var tt = player.textTracks();
        if (!tt || !tt.on)
            return;
        this.on(tt, 'addtrack', this.update);
        this.on(tt, 'removetrack', this.update);
        this.on(tt, 'change', this.update);
        this.update();
    },
    createEl: function(){
        var el = Button.prototype.createEl.call(this);
        this.icon_ = vjs.createEl('div', {className: 'vjs-button-icon',
            innerHTML: captions_icon_svg});
        el.insertBefore(this.icon_, el.firstChild);
        return el;
    },
    handleClick: function(){
        if (!this.track)
            return;
        var enable = this.track.mode!='showing';
        this.track.mode = enable ? 'showing' : 'disabled';
        if (enable)
            this.showHint();
    },
    showHint: function(){
        var track;
        if (!(track = this.track))
            return;
        var d = this.player().textTrackDisplay, i;
        if (this.timeout)
            this.clearTimeout(this.timeout);
        var cues = [
            new vtt.VTTCue(0, 0, get_track_label(track)),
            new vtt.VTTCue(0, 0, this.localize('press %s to configure'))
        ];
        for (i=0; i<cues.length; i++)
        {
            cues[i].align = 'start';
            cues[i].position = 28;
            cues[i].line = 2+i;
        }
        for (i=0; i<track.activeCues.length; i++)
            cues.push(track.activeCues[i]);
        d.updateForTrack({activeCues: cues});
        var svg = settings_icon_svg.replace(/viewBox="[^"]*"/,
            'viewBox="6 6 24 24"');
        cues[1].displayState.innerHTML = cues[1].displayState.innerHTML
            .replace('%s', svg);
        this.timeout = this.setTimeout(function(){ d.updateDisplay(); }, 3000);
    },
    update: function(){
        var tracks = get_captions_tracks(this.player());
        if (tracks.length)
            this.show();
        else
            this.hide();
        if (this.track && tracks.indexOf(this.track)==-1)
            this.track = null;
        var current = find(tracks, function(t){ return t.mode=='showing'; });
        if (current)
            this.track = current;
        if (!this.track)
        {
            this.track = find(tracks, function(t){ return t['default']; }) ||
                tracks[0];
        }
        this.toggleClass('vjs-pressed',
            this.track && this.track.mode=='showing');
    },
});
function local_storage_set(key, value){
    try { vjs.utils.localStorage.setItem(key, value); } catch(e){}
}
function local_storage_get(key){
    try { return vjs.utils.localStorage.getItem(key); }
    catch(e){ return null; }
}
function get_top_url(){
    return window.top==window ? location.href : document.referrer;
}
function seek(player, pos){
    player.one('loadeddata', function(){
        if (player.techName_=='Html5')
            return void player.currentTime(pos);
        // XXX andrey: if seek immediately, video can stuck
        // or play without sound, probably loadeddata is triggered
        // when flash NetStream is not ready to seek yet
        player.on('timeupdate', function on_timeupdate(){
            if (!player.currentTime())
                return;
            player.off('timeupdate', on_timeupdate);
            player.currentTime(pos);
        });
    });
}
function multiple_players(){
    return Object.keys(vjs.getPlayers()).length>1;
}
function cmp_url(a, b){
    var re = /^https?\:\/\//i;
    return a.replace(re, '//')==b.replace(re, '//');
}

vjs.plugin('settings', function(opt){
    var video = this;
    opt = vjs.mergeOptions({
        info: true,
        report: true,
        quality: false,
        volume: {level: 1, mute: !!video.options_.muted},
        debugging: true,
        about: true,
    }, opt);
    video.ready(function(){
        function sources_normalize(sources, label_sav){
            var i, source_def, source_sav;
            sources = sources.filter(function(e){ return e.src; });
            for (i=0; i<sources.length; i++)
            {
                if (!sources[i].label)
                    sources[i].label = sources[i].type;
                if (!source_def && sources[i]['default']!==undefined)
                    source_def = sources[i];
                if (label_sav && label_sav==sources[i].label &&
                    sources[i]['prevent-default']===undefined)
                {
                    source_sav = sources[i];
                }
            }
            for (i=0; i<sources.length; i++)
            {
                sources[i]['default'] =
                    source_sav ? sources[i]===source_sav :
                    source_def ? sources[i]===source_def : false;
            }
            return sources;
        }
        if (opt.quality===true)
            opt.quality = {sources: video.options_.sources};
        if (opt.quality && !is_hls_provider(video))
        {
            var quality_key = 'vjs5_quality';
            opt.quality.sources = sources_normalize(opt.quality.sources,
                local_storage_get(quality_key));
            video.on('resolutionchange', function(){
                var sources = opt.quality.sources;
                for (var i=0; i<sources.length; i++)
                {
                    if (!cmp_url(video.currentSrc(), sources[i].src))
                        continue;
                    local_storage_set(quality_key, sources[i].label);
                    break;
                }
            });
        }
        video.controlBar.addChild('CaptionsToggle', vjs.mergeOptions(opt));
        video.controlBar.addChild('SettingsButton', vjs.mergeOptions(opt));
        if (opt.info)
            video.addChild('InfoOverlay');
        if (opt.report)
            video.addChild('NotifyOverlay');
        if (opt.volume)
        {
            var volume_key = 'vjs5_volume', mute_key = 'vjs5_mute';
            // quality configuration above might have reset the source
            // thus make sure video is ready before changing the volume
            video.ready(function(){
                if (!opt.volume.override_local_storage)
                {
                    var ls_level, ls_mute;
                    if ((ls_level = local_storage_get(volume_key))!=null)
                        opt.volume.level = ls_level;
                    if ((ls_mute = local_storage_get(mute_key))!=null)
                        opt.volume.mute = ls_mute=='true';
                }
                video.volume(opt.volume.level);
                video.muted(opt.volume.mute);
            });
            video.on('volumechange', function(){
                local_storage_set(volume_key, video.volume());
                local_storage_set(mute_key, video.muted());
            });
        }
        video.addChild('PopupMenu', vjs.mergeOptions(opt));
        var url = get_top_url(), m;
        if (!multiple_players() && (m = url.match(/#(?:.*&)?t=(\d*)/)))
            seek(video, parseInt(m[1], 10));
    });
});

}(window, window.videojs));

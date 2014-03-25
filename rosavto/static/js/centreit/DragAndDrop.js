/**
 * Реализация drag and drop для переноса маркеров карты на виджеты.
 * 
 * Пример использования можно найти в RealtimeLayer.js
 */
define(["dojo/on", "dojo/_base/window", "dojo/dom-construct", 'dojo/topic', 'dojo/_base/lang'], function(on, win, dom, topic, lang) {
    return {
        dragStart: false,
        dragReady: false,
        init: function() {
            var me = this;
            on(win.doc, "mouseup", function() {
                if (me.dragStart) {
                    if (me.dragElement) {
                        me.dragElement.remove();
                    }
                    topic.publish('map/markerDragEnd');
                }
                me.dragStart = false;
                me.dragReady = false;
            });
            on(win.doc, "mousemove", function(e) {
                if (me.dragStart && me.dragElement) {
                    me.dragElement.style['top'] = (e.pageY + 10) + 'px';
                    me.dragElement.style['left'] = (e.pageX + 10) + 'px';
                }
                if (me.dragReady && !me.dragStart) {
                    me.dragReady = false;
                    me.dragStart = true;
                    if (me.dragElement) {
                        me.dragElement.style['top'] = (e.clientY + 10) + 'px';
                        me.dragElement.style['left'] = (e.clientX + 10) + 'px';
                        me.dragElement.style['position'] = 'absolute';
                        me.dragElement.style['-webkit-transform'] = '';
                        me.dragElement.style['transform'] = '';
                        me.dragElement.style['-o-transform'] = '';
                        me.dragElement.style['-moz-transform'] = '';
                        me.dragElement.style['-ms-transform'] = '';
                        me.dragElement.style.opacity = .4;
                        dom.place(me.dragElement, win.doc.body, 'first');
                    }
                    topic.publish('map/markerDragStart');
                }
            });
            on(win.doc, "click", function() {
                me.dragStart = false;
                me.dragReady = false;
            });
        },
        onDragStart: function(target, markerId, type) {
            this.dragReady = true;
            this.dragStart = false;
            if (target) {
                this.dragElement = lang.clone(target);
            } else {
                this.dragElement = null;
            }
            this.markerId = markerId;
            this.type = type;
        }
    };
});

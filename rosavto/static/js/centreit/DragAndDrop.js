/**
 * Реализация drag and drop для переноса маркеров карты на виджеты.
 * 
 * Пример использования можно найти в RealtimeLayer.js
 */
define(["dojo/on", "dojo/_base/window", "dojo/dom-construct"], function(on, win, dom) {
    return {
        dragStart: false,
        dragReady: false,
        init: function() {
            var me = this;
            on(win.doc, "mouseup", function(e) {
                me.dragReady = false;
                if (me.dragStart || me.dragReady) {
                    me.dragElement.remove();
                }
            });
            on(win.doc, "mousemove", function(e) {
                if (me.dragStart) {
                    me.dragElement.style['top'] = (e.pageY + 10) + 'px';
                    me.dragElement.style['left'] = (e.pageX + 10) + 'px';
                }
                if (me.dragReady && !me.dragStart) {
                    me.dragReady = false;
                    me.dragStart = true;
                    me.dragElement.style['top'] = (e.clientY + 10) + 'px';
                    me.dragElement.style['left'] = (e.clientX + 10) + 'px';
                    me.dragElement.style['position'] = 'absolute';
                    me.dragElement.style['-webkit-transform'] = '';
                    me.dragElement.style['transform'] = '';
                    me.dragElement.style['-o-transform'] = '';
                    me.dragElement.style['-moz-transform'] = '';
                    me.dragElement.style['-ms-transform'] = '';
                    me.dragElement.style.opacity = .4;
                    var root = dojo.byId("ext-gen1018");
                    dom.place(me.dragElement, root, 'first');
                }
            });
            on(win.doc, "click", function(e) {
                if (me.dragStart || me.dragReady) {
                    me.dragStart = false;
                    me.dragReady = false;
                }
            });
        },
        checkDragElementType: function(widgetType) {
            return this.dragStart && this.dragElement && this.dragElement.type === widgetType;
        }
    };
});

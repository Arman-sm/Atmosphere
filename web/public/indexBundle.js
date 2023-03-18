
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var main = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.57.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Audio.svelte generated by Svelte v3.57.0 */

    const file$5 = "src/Audio.svelte";

    function create_fragment$5(ctx) {
    	let button;
    	let div;
    	let div_style_value;
    	let t0;
    	let span0;
    	let t1;
    	let t2;
    	let span1;
    	let t3;
    	let button_title_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			div = element("div");
    			t0 = space();
    			span0 = element("span");
    			t1 = text(/*title*/ ctx[2]);
    			t2 = space();
    			span1 = element("span");
    			t3 = text(/*singer*/ ctx[3]);
    			attr_dev(div, "style", div_style_value = "--background : url(/api/v1/audio/" + /*ID*/ ctx[0] + "?query=Cover)");
    			add_location(div, file$5, 24, 1, 633);
    			attr_dev(span0, "title", /*title*/ ctx[2]);
    			add_location(span0, file$5, 27, 1, 709);
    			attr_dev(span1, "title", /*singer*/ ctx[3]);
    			add_location(span1, file$5, 28, 1, 739);
    			attr_dev(button, "class", "browserItem");
    			attr_dev(button, "data-item-type", "audio");
    			attr_dev(button, "data-id", /*ID*/ ctx[0]);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "title", button_title_value = (/*title*/ ctx[2] || "No title") + (/*singer*/ ctx[3] ? ` by ${/*singer*/ ctx[3]}` : ""));
    			toggle_class(button, "browserItemLoading", /*isLoading*/ ctx[1]);
    			add_location(button, file$5, 20, 0, 420);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, div);
    			append_dev(button, t0);
    			append_dev(button, span0);
    			append_dev(span0, t1);
    			append_dev(button, t2);
    			append_dev(button, span1);
    			append_dev(span1, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false, false),
    					listen_dev(button, "contextmenu", /*contextmenu_handler*/ ctx[5], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ID*/ 1 && div_style_value !== (div_style_value = "--background : url(/api/v1/audio/" + /*ID*/ ctx[0] + "?query=Cover)")) {
    				attr_dev(div, "style", div_style_value);
    			}

    			if (dirty & /*title*/ 4) set_data_dev(t1, /*title*/ ctx[2]);

    			if (dirty & /*title*/ 4) {
    				attr_dev(span0, "title", /*title*/ ctx[2]);
    			}

    			if (dirty & /*singer*/ 8) set_data_dev(t3, /*singer*/ ctx[3]);

    			if (dirty & /*singer*/ 8) {
    				attr_dev(span1, "title", /*singer*/ ctx[3]);
    			}

    			if (dirty & /*ID*/ 1) {
    				attr_dev(button, "data-id", /*ID*/ ctx[0]);
    			}

    			if (dirty & /*title, singer*/ 12 && button_title_value !== (button_title_value = (/*title*/ ctx[2] || "No title") + (/*singer*/ ctx[3] ? ` by ${/*singer*/ ctx[3]}` : ""))) {
    				attr_dev(button, "title", button_title_value);
    			}

    			if (dirty & /*isLoading*/ 2) {
    				toggle_class(button, "browserItemLoading", /*isLoading*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Audio', slots, []);
    	let { ID = "" } = $$props;
    	let { isLoading = true } = $$props;
    	let title = "";
    	let singer = "";

    	async function updateInfo(ID) {
    		const results = await Promise.allSettled([
    			fetch(`/api/v1/audio/${ID}?query=Title`).then(res => res.text()),
    			fetch(`/api/v1/audio/${ID}?query=Singer`).then(res => res.text())
    		]);

    		$$invalidate(2, title = results[0].value || "");
    		$$invalidate(3, singer = results[1].value || "");
    	}

    	const writable_props = ['ID', 'isLoading'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Audio> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function contextmenu_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('ID' in $$props) $$invalidate(0, ID = $$props.ID);
    		if ('isLoading' in $$props) $$invalidate(1, isLoading = $$props.isLoading);
    	};

    	$$self.$capture_state = () => ({ ID, isLoading, title, singer, updateInfo });

    	$$self.$inject_state = $$props => {
    		if ('ID' in $$props) $$invalidate(0, ID = $$props.ID);
    		if ('isLoading' in $$props) $$invalidate(1, isLoading = $$props.isLoading);
    		if ('title' in $$props) $$invalidate(2, title = $$props.title);
    		if ('singer' in $$props) $$invalidate(3, singer = $$props.singer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ID*/ 1) {
    			updateInfo(ID);
    		}
    	};

    	return [ID, isLoading, title, singer, click_handler, contextmenu_handler];
    }

    let Audio$1 = class Audio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { ID: 0, isLoading: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Audio",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get ID() {
    		throw new Error("<Audio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ID(value) {
    		throw new Error("<Audio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isLoading() {
    		throw new Error("<Audio>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isLoading(value) {
    		throw new Error("<Audio>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    };

    /* src/Container.svelte generated by Svelte v3.57.0 */

    const file$4 = "src/Container.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let div;
    	let t0;
    	let img;
    	let img_src_value;
    	let t1;
    	let span0;
    	let t2;
    	let t3;
    	let span1;
    	let button_title_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			div = element("div");
    			t0 = space();
    			img = element("img");
    			t1 = space();
    			span0 = element("span");
    			t2 = text(/*title*/ ctx[2]);
    			t3 = space();
    			span1 = element("span");
    			attr_dev(div, "class", "browserItemCover containerCover svelte-8bm6fj");
    			set_style(div, "--background", "url(/api/v1/container/" + /*ID*/ ctx[0] + "?query=Cover)");
    			add_location(div, file$4, 25, 1, 531);
    			if (!src_url_equal(img.src, img_src_value = "./images/container.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "album indicator");
    			set_style(img, "width", "2.5rem");
    			set_style(img, "aspect-ratio", "1/1");
    			set_style(img, "margin-left", "calc(-2.5rem - .5rem)");
    			set_style(img, "clear", "right");
    			set_style(img, "position", "relative");
    			set_style(img, "margin-top", ".25rem");
    			add_location(img, file$4, 27, 1, 648);
    			attr_dev(span0, "title", /*title*/ ctx[2]);
    			add_location(span0, file$4, 30, 1, 842);
    			add_location(span1, file$4, 31, 1, 878);
    			attr_dev(button, "class", "browserItem");
    			attr_dev(button, "data-item-type", "container");
    			attr_dev(button, "data-id", /*ID*/ ctx[0]);
    			attr_dev(button, "data-title", /*title*/ ctx[2]);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "title", button_title_value = /*title*/ ctx[2] || "No title");
    			toggle_class(button, "browserItemLoading", /*isLoading*/ ctx[1]);
    			add_location(button, file$4, 21, 0, 316);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, div);
    			append_dev(button, t0);
    			append_dev(button, img);
    			append_dev(button, t1);
    			append_dev(button, span0);
    			append_dev(span0, t2);
    			append_dev(button, t3);
    			append_dev(button, span1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*browseWrap*/ ctx[3], false, false, false, false),
    					listen_dev(button, "contextmenu", /*contextmenu_handler*/ ctx[5], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ID*/ 1) {
    				set_style(div, "--background", "url(/api/v1/container/" + /*ID*/ ctx[0] + "?query=Cover)");
    			}

    			if (dirty & /*title*/ 4) set_data_dev(t2, /*title*/ ctx[2]);

    			if (dirty & /*title*/ 4) {
    				attr_dev(span0, "title", /*title*/ ctx[2]);
    			}

    			if (dirty & /*ID*/ 1) {
    				attr_dev(button, "data-id", /*ID*/ ctx[0]);
    			}

    			if (dirty & /*title*/ 4) {
    				attr_dev(button, "data-title", /*title*/ ctx[2]);
    			}

    			if (dirty & /*title*/ 4 && button_title_value !== (button_title_value = /*title*/ ctx[2] || "No title")) {
    				attr_dev(button, "title", button_title_value);
    			}

    			if (dirty & /*isLoading*/ 2) {
    				toggle_class(button, "browserItemLoading", /*isLoading*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Container', slots, []);
    	let { ID = "" } = $$props;
    	let { isLoading = false } = $$props;

    	let { browse = () => {
    		
    	} } = $$props;

    	function browseWrap() {
    		browse(ID);
    	}

    	let title = "";
    	const writable_props = ['ID', 'isLoading', 'browse'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Container> was created with unknown prop '${key}'`);
    	});

    	function contextmenu_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('ID' in $$props) $$invalidate(0, ID = $$props.ID);
    		if ('isLoading' in $$props) $$invalidate(1, isLoading = $$props.isLoading);
    		if ('browse' in $$props) $$invalidate(4, browse = $$props.browse);
    	};

    	$$self.$capture_state = () => ({ ID, isLoading, browse, browseWrap, title });

    	$$self.$inject_state = $$props => {
    		if ('ID' in $$props) $$invalidate(0, ID = $$props.ID);
    		if ('isLoading' in $$props) $$invalidate(1, isLoading = $$props.isLoading);
    		if ('browse' in $$props) $$invalidate(4, browse = $$props.browse);
    		if ('title' in $$props) $$invalidate(2, title = $$props.title);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*ID*/ 1) {
    			fetch(`/api/v1/container/${ID}?query=Title`).then(res => res.text().then(txt => $$invalidate(2, title = txt)));
    		}
    	};

    	return [ID, isLoading, title, browseWrap, browse, contextmenu_handler];
    }

    class Container extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { ID: 0, isLoading: 1, browse: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Container",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get ID() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ID(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isLoading() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isLoading(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get browse() {
    		throw new Error("<Container>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set browse(value) {
    		throw new Error("<Container>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/BaseBrowser.svelte generated by Svelte v3.57.0 */
    const file$3 = "src/BaseBrowser.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (33:1) {#each containerIDs as containerID}
    function create_each_block_1(ctx) {
    	let container;
    	let current;

    	container = new Container({
    			props: {
    				isLoading: true,
    				ID: /*containerID*/ ctx[12],
    				browse: /*browseByID*/ ctx[4]
    			},
    			$$inline: true
    		});

    	container.$on("contextmenu", function () {
    		if (is_function(/*onContextMenu*/ ctx[1])) /*onContextMenu*/ ctx[1].apply(this, arguments);
    	});

    	const block = {
    		c: function create() {
    			create_component(container.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(container, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const container_changes = {};
    			if (dirty & /*containerIDs*/ 8) container_changes.ID = /*containerID*/ ctx[12];
    			container.$set(container_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(container.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(container.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(container, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(33:1) {#each containerIDs as containerID}",
    		ctx
    	});

    	return block;
    }

    // (36:1) {#each audioIDs as audioID}
    function create_each_block$1(ctx) {
    	let audio;
    	let current;

    	function click_handler() {
    		return /*click_handler*/ ctx[7](/*audioID*/ ctx[9]);
    	}

    	audio = new Audio$1({
    			props: { isLoading: true, ID: /*audioID*/ ctx[9] },
    			$$inline: true
    		});

    	audio.$on("contextmenu", function () {
    		if (is_function(/*onContextMenu*/ ctx[1])) /*onContextMenu*/ ctx[1].apply(this, arguments);
    	});

    	audio.$on("click", click_handler);

    	const block = {
    		c: function create() {
    			create_component(audio.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(audio, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const audio_changes = {};
    			if (dirty & /*audioIDs*/ 4) audio_changes.ID = /*audioID*/ ctx[9];
    			audio.$set(audio_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(audio.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(audio.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(audio, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(36:1) {#each audioIDs as audioID}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let t;
    	let current;
    	let each_value_1 = /*containerIDs*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value = /*audioIDs*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "baseBrowser");
    			add_location(div, file$3, 31, 0, 561);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(div, null);
    				}
    			}

    			append_dev(div, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*containerIDs, browseByID, onContextMenu*/ 26) {
    				each_value_1 = /*containerIDs*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(div, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*audioIDs, onContextMenu, playAudio*/ 7) {
    				each_value = /*audioIDs*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BaseBrowser', slots, []);

    	let { onBrowse = () => {
    		
    	} } = $$props;

    	let { playAudio = () => {
    		
    	} } = $$props;

    	let { onContextMenu = () => {
    		
    	} } = $$props;

    	let { viewID = "" } = $$props;

    	async function refresh() {
    		const items = await fetch(`/api/v1/view/${viewID}`).then(response => response.json()).then(json => json);
    		$$invalidate(2, audioIDs = items.audios);
    		$$invalidate(3, containerIDs = items.containers);
    	}

    	function browseByID(ID) {
    		$$invalidate(5, viewID = ID);
    		onBrowse(ID);
    	}

    	let audioIDs = [];
    	let containerIDs = [];
    	const writable_props = ['onBrowse', 'playAudio', 'onContextMenu', 'viewID'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BaseBrowser> was created with unknown prop '${key}'`);
    	});

    	const click_handler = audioID => playAudio(audioID);

    	$$self.$$set = $$props => {
    		if ('onBrowse' in $$props) $$invalidate(6, onBrowse = $$props.onBrowse);
    		if ('playAudio' in $$props) $$invalidate(0, playAudio = $$props.playAudio);
    		if ('onContextMenu' in $$props) $$invalidate(1, onContextMenu = $$props.onContextMenu);
    		if ('viewID' in $$props) $$invalidate(5, viewID = $$props.viewID);
    	};

    	$$self.$capture_state = () => ({
    		Audio: Audio$1,
    		Container,
    		onBrowse,
    		playAudio,
    		onContextMenu,
    		viewID,
    		refresh,
    		browseByID,
    		audioIDs,
    		containerIDs
    	});

    	$$self.$inject_state = $$props => {
    		if ('onBrowse' in $$props) $$invalidate(6, onBrowse = $$props.onBrowse);
    		if ('playAudio' in $$props) $$invalidate(0, playAudio = $$props.playAudio);
    		if ('onContextMenu' in $$props) $$invalidate(1, onContextMenu = $$props.onContextMenu);
    		if ('viewID' in $$props) $$invalidate(5, viewID = $$props.viewID);
    		if ('audioIDs' in $$props) $$invalidate(2, audioIDs = $$props.audioIDs);
    		if ('containerIDs' in $$props) $$invalidate(3, containerIDs = $$props.containerIDs);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*viewID*/ 32) {
    			refresh();
    		}
    	};

    	return [
    		playAudio,
    		onContextMenu,
    		audioIDs,
    		containerIDs,
    		browseByID,
    		viewID,
    		onBrowse,
    		click_handler
    	];
    }

    class BaseBrowser extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			onBrowse: 6,
    			playAudio: 0,
    			onContextMenu: 1,
    			viewID: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BaseBrowser",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get onBrowse() {
    		throw new Error("<BaseBrowser>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onBrowse(value) {
    		throw new Error("<BaseBrowser>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playAudio() {
    		throw new Error("<BaseBrowser>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playAudio(value) {
    		throw new Error("<BaseBrowser>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onContextMenu() {
    		throw new Error("<BaseBrowser>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onContextMenu(value) {
    		throw new Error("<BaseBrowser>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get viewID() {
    		throw new Error("<BaseBrowser>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set viewID(value) {
    		throw new Error("<BaseBrowser>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Browser.svelte generated by Svelte v3.57.0 */
    const file$2 = "src/Browser.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (26:2) {#each path as container}
    function create_each_block(ctx) {
    	let h1;
    	let t_value = /*container*/ ctx[7].title + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*container*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t = text(t_value);
    			add_location(h1, file$2, 27, 3, 613);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t);

    			if (!mounted) {
    				dispose = listen_dev(h1, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*path*/ 8 && t_value !== (t_value = /*container*/ ctx[7].title + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(26:2) {#each path as container}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let basebrowser;
    	let current;
    	let each_value = /*path*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	basebrowser = new BaseBrowser({
    			props: {
    				viewID: /*viewID*/ ctx[0],
    				onContextMenu: /*onContextMenu*/ ctx[1],
    				onBrowse: /*dive*/ ctx[5],
    				playAudio: /*playAudio*/ ctx[2]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			create_component(basebrowser.$$.fragment);
    			attr_dev(div0, "class", "browserPath");
    			add_location(div0, file$2, 24, 1, 496);
    			attr_dev(div1, "class", "browser");
    			add_location(div1, file$2, 23, 0, 473);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}

    			append_dev(div1, t);
    			mount_component(basebrowser, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*updatePath, path*/ 24) {
    				each_value = /*path*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			const basebrowser_changes = {};
    			if (dirty & /*viewID*/ 1) basebrowser_changes.viewID = /*viewID*/ ctx[0];
    			if (dirty & /*onContextMenu*/ 2) basebrowser_changes.onContextMenu = /*onContextMenu*/ ctx[1];
    			if (dirty & /*playAudio*/ 4) basebrowser_changes.playAudio = /*playAudio*/ ctx[2];
    			basebrowser.$set(basebrowser_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(basebrowser.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(basebrowser.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			destroy_component(basebrowser);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Browser', slots, []);
    	let { onContextMenu } = $$props;
    	let { viewID = "" } = $$props;

    	let { playAudio = () => {
    		
    	} } = $$props;

    	let path = [{ ID: "", title: "" }];

    	function updatePath(ID) {
    		$$invalidate(3, path = path.slice(0, path.map(item => item.ID).indexOf(ID) + 1));
    		$$invalidate(0, viewID = ID);
    	}

    	async function dive(ID) {
    		path.push({
    			ID,
    			title: await fetch(`/api/v1/container/${ID}?query=Title`).then(res => res.text())
    		});

    		$$invalidate(0, viewID = ID);
    	}

    	$$self.$$.on_mount.push(function () {
    		if (onContextMenu === undefined && !('onContextMenu' in $$props || $$self.$$.bound[$$self.$$.props['onContextMenu']])) {
    			console.warn("<Browser> was created without expected prop 'onContextMenu'");
    		}
    	});

    	const writable_props = ['onContextMenu', 'viewID', 'playAudio'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Browser> was created with unknown prop '${key}'`);
    	});

    	const click_handler = container => updatePath(container.ID);

    	$$self.$$set = $$props => {
    		if ('onContextMenu' in $$props) $$invalidate(1, onContextMenu = $$props.onContextMenu);
    		if ('viewID' in $$props) $$invalidate(0, viewID = $$props.viewID);
    		if ('playAudio' in $$props) $$invalidate(2, playAudio = $$props.playAudio);
    	};

    	$$self.$capture_state = () => ({
    		BaseBrowser,
    		onContextMenu,
    		viewID,
    		playAudio,
    		path,
    		updatePath,
    		dive
    	});

    	$$self.$inject_state = $$props => {
    		if ('onContextMenu' in $$props) $$invalidate(1, onContextMenu = $$props.onContextMenu);
    		if ('viewID' in $$props) $$invalidate(0, viewID = $$props.viewID);
    		if ('playAudio' in $$props) $$invalidate(2, playAudio = $$props.playAudio);
    		if ('path' in $$props) $$invalidate(3, path = $$props.path);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*viewID*/ 1) {
    			updatePath(viewID);
    		}
    	};

    	return [viewID, onContextMenu, playAudio, path, updatePath, dive, click_handler];
    }

    class Browser extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			onContextMenu: 1,
    			viewID: 0,
    			playAudio: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Browser",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get onContextMenu() {
    		throw new Error("<Browser>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onContextMenu(value) {
    		throw new Error("<Browser>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get viewID() {
    		throw new Error("<Browser>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set viewID(value) {
    		throw new Error("<Browser>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playAudio() {
    		throw new Error("<Browser>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playAudio(value) {
    		throw new Error("<Browser>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var Howler$1 = {};

    /*!
     *  howler.js v2.2.3
     *  howlerjs.com
     *
     *  (c) 2013-2020, James Simpson of GoldFire Studios
     *  goldfirestudios.com
     *
     *  MIT License
     */

    (function (exports) {
    	(function() {
    	  
    		/** Global Methods **/
    		/***************************************************************************/
    	  
    		/**
    		 * Create the global controller. All contained methods and properties apply
    		 * to all sounds that are currently playing or will be in the future.
    		 */
    		var HowlerGlobal = function() {
    		  this.init();
    		};
    		HowlerGlobal.prototype = {
    		  /**
    		   * Initialize the global Howler object.
    		   * @return {Howler}
    		   */
    		  init: function() {
    			var self = this || Howler;
    	  
    			// Create a global ID counter.
    			self._counter = 1000;
    	  
    			// Pool of unlocked HTML5 Audio objects.
    			self._html5AudioPool = [];
    			self.html5PoolSize = 10;
    	  
    			// Internal properties.
    			self._codecs = {};
    			self._howls = [];
    			self._muted = false;
    			self._volume = 1;
    			self._canPlayEvent = 'canplaythrough';
    			self._navigator = (typeof window !== 'undefined' && window.navigator) ? window.navigator : null;
    	  
    			// Public properties.
    			self.masterGain = null;
    			self.noAudio = false;
    			self.usingWebAudio = true;
    			self.autoSuspend = true;
    			self.ctx = null;
    	  
    			// Set to false to disable the auto audio unlocker.
    			self.autoUnlock = true;
    	  
    			// Setup the various state values for global tracking.
    			self._setup();
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Get/set the global volume for all sounds.
    		   * @param  {Float} vol Volume from 0.0 to 1.0.
    		   * @return {Howler/Float}     Returns self or current volume.
    		   */
    		  volume: function(vol) {
    			var self = this || Howler;
    			vol = parseFloat(vol);
    	  
    			// If we don't have an AudioContext created yet, run the setup.
    			if (!self.ctx) {
    			  setupAudioContext();
    			}
    	  
    			if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
    			  self._volume = vol;
    	  
    			  // Don't update any of the nodes if we are muted.
    			  if (self._muted) {
    				return self;
    			  }
    	  
    			  // When using Web Audio, we just need to adjust the master gain.
    			  if (self.usingWebAudio) {
    				self.masterGain.gain.setValueAtTime(vol, Howler.ctx.currentTime);
    			  }
    	  
    			  // Loop through and change volume for all HTML5 audio nodes.
    			  for (var i=0; i<self._howls.length; i++) {
    				if (!self._howls[i]._webAudio) {
    				  // Get all of the sounds in this Howl group.
    				  var ids = self._howls[i]._getSoundIds();
    	  
    				  // Loop through all sounds and change the volumes.
    				  for (var j=0; j<ids.length; j++) {
    					var sound = self._howls[i]._soundById(ids[j]);
    	  
    					if (sound && sound._node) {
    					  sound._node.volume = sound._volume * vol;
    					}
    				  }
    				}
    			  }
    	  
    			  return self;
    			}
    	  
    			return self._volume;
    		  },
    	  
    		  /**
    		   * Handle muting and unmuting globally.
    		   * @param  {Boolean} muted Is muted or not.
    		   */
    		  mute: function(muted) {
    			var self = this || Howler;
    	  
    			// If we don't have an AudioContext created yet, run the setup.
    			if (!self.ctx) {
    			  setupAudioContext();
    			}
    	  
    			self._muted = muted;
    	  
    			// With Web Audio, we just need to mute the master gain.
    			if (self.usingWebAudio) {
    			  self.masterGain.gain.setValueAtTime(muted ? 0 : self._volume, Howler.ctx.currentTime);
    			}
    	  
    			// Loop through and mute all HTML5 Audio nodes.
    			for (var i=0; i<self._howls.length; i++) {
    			  if (!self._howls[i]._webAudio) {
    				// Get all of the sounds in this Howl group.
    				var ids = self._howls[i]._getSoundIds();
    	  
    				// Loop through all sounds and mark the audio node as muted.
    				for (var j=0; j<ids.length; j++) {
    				  var sound = self._howls[i]._soundById(ids[j]);
    	  
    				  if (sound && sound._node) {
    					sound._node.muted = (muted) ? true : sound._muted;
    				  }
    				}
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Handle stopping all sounds globally.
    		   */
    		  stop: function() {
    			var self = this || Howler;
    	  
    			// Loop through all Howls and stop them.
    			for (var i=0; i<self._howls.length; i++) {
    			  self._howls[i].stop();
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Unload and destroy all currently loaded Howl objects.
    		   * @return {Howler}
    		   */
    		  unload: function() {
    			var self = this || Howler;
    	  
    			for (var i=self._howls.length-1; i>=0; i--) {
    			  self._howls[i].unload();
    			}
    	  
    			// Create a new AudioContext to make sure it is fully reset.
    			if (self.usingWebAudio && self.ctx && typeof self.ctx.close !== 'undefined') {
    			  self.ctx.close();
    			  self.ctx = null;
    			  setupAudioContext();
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Check for codec support of specific extension.
    		   * @param  {String} ext Audio file extention.
    		   * @return {Boolean}
    		   */
    		  codecs: function(ext) {
    			return (this || Howler)._codecs[ext.replace(/^x-/, '')];
    		  },
    	  
    		  /**
    		   * Setup various state values for global tracking.
    		   * @return {Howler}
    		   */
    		  _setup: function() {
    			var self = this || Howler;
    	  
    			// Keeps track of the suspend/resume state of the AudioContext.
    			self.state = self.ctx ? self.ctx.state || 'suspended' : 'suspended';
    	  
    			// Automatically begin the 30-second suspend process
    			self._autoSuspend();
    	  
    			// Check if audio is available.
    			if (!self.usingWebAudio) {
    			  // No audio is available on this system if noAudio is set to true.
    			  if (typeof Audio !== 'undefined') {
    				try {
    				  var test = new Audio();
    	  
    				  // Check if the canplaythrough event is available.
    				  if (typeof test.oncanplaythrough === 'undefined') {
    					self._canPlayEvent = 'canplay';
    				  }
    				} catch(e) {
    				  self.noAudio = true;
    				}
    			  } else {
    				self.noAudio = true;
    			  }
    			}
    	  
    			// Test to make sure audio isn't disabled in Internet Explorer.
    			try {
    			  var test = new Audio();
    			  if (test.muted) {
    				self.noAudio = true;
    			  }
    			} catch (e) {}
    	  
    			// Check for supported codecs.
    			if (!self.noAudio) {
    			  self._setupCodecs();
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Check for browser support for various codecs and cache the results.
    		   * @return {Howler}
    		   */
    		  _setupCodecs: function() {
    			var self = this || Howler;
    			var audioTest = null;
    	  
    			// Must wrap in a try/catch because IE11 in server mode throws an error.
    			try {
    			  audioTest = (typeof Audio !== 'undefined') ? new Audio() : null;
    			} catch (err) {
    			  return self;
    			}
    	  
    			if (!audioTest || typeof audioTest.canPlayType !== 'function') {
    			  return self;
    			}
    	  
    			var mpegTest = audioTest.canPlayType('audio/mpeg;').replace(/^no$/, '');
    	  
    			// Opera version <33 has mixed MP3 support, so we need to check for and block it.
    			var ua = self._navigator ? self._navigator.userAgent : '';
    			var checkOpera = ua.match(/OPR\/([0-6].)/g);
    			var isOldOpera = (checkOpera && parseInt(checkOpera[0].split('/')[1], 10) < 33);
    			var checkSafari = ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1;
    			var safariVersion = ua.match(/Version\/(.*?) /);
    			var isOldSafari = (checkSafari && safariVersion && parseInt(safariVersion[1], 10) < 15);
    	  
    			self._codecs = {
    			  mp3: !!(!isOldOpera && (mpegTest || audioTest.canPlayType('audio/mp3;').replace(/^no$/, ''))),
    			  mpeg: !!mpegTest,
    			  opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
    			  ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
    			  oga: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
    			  wav: !!(audioTest.canPlayType('audio/wav; codecs="1"') || audioTest.canPlayType('audio/wav')).replace(/^no$/, ''),
    			  aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
    			  caf: !!audioTest.canPlayType('audio/x-caf;').replace(/^no$/, ''),
    			  m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
    			  m4b: !!(audioTest.canPlayType('audio/x-m4b;') || audioTest.canPlayType('audio/m4b;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
    			  mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
    			  weba: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')),
    			  webm: !!(!isOldSafari && audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')),
    			  dolby: !!audioTest.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/, ''),
    			  flac: !!(audioTest.canPlayType('audio/x-flac;') || audioTest.canPlayType('audio/flac;')).replace(/^no$/, '')
    			};
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Some browsers/devices will only allow audio to be played after a user interaction.
    		   * Attempt to automatically unlock audio on the first user interaction.
    		   * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
    		   * @return {Howler}
    		   */
    		  _unlockAudio: function() {
    			var self = this || Howler;
    	  
    			// Only run this if Web Audio is supported and it hasn't already been unlocked.
    			if (self._audioUnlocked || !self.ctx) {
    			  return;
    			}
    	  
    			self._audioUnlocked = false;
    			self.autoUnlock = false;
    	  
    			// Some mobile devices/platforms have distortion issues when opening/closing tabs and/or web views.
    			// Bugs in the browser (especially Mobile Safari) can cause the sampleRate to change from 44100 to 48000.
    			// By calling Howler.unload(), we create a new AudioContext with the correct sampleRate.
    			if (!self._mobileUnloaded && self.ctx.sampleRate !== 44100) {
    			  self._mobileUnloaded = true;
    			  self.unload();
    			}
    	  
    			// Scratch buffer for enabling iOS to dispose of web audio buffers correctly, as per:
    			// http://stackoverflow.com/questions/24119684
    			self._scratchBuffer = self.ctx.createBuffer(1, 1, 22050);
    	  
    			// Call this method on touch start to create and play a buffer,
    			// then check if the audio actually played to determine if
    			// audio has now been unlocked on iOS, Android, etc.
    			var unlock = function(e) {
    			  // Create a pool of unlocked HTML5 Audio objects that can
    			  // be used for playing sounds without user interaction. HTML5
    			  // Audio objects must be individually unlocked, as opposed
    			  // to the WebAudio API which only needs a single activation.
    			  // This must occur before WebAudio setup or the source.onended
    			  // event will not fire.
    			  while (self._html5AudioPool.length < self.html5PoolSize) {
    				try {
    				  var audioNode = new Audio();
    	  
    				  // Mark this Audio object as unlocked to ensure it can get returned
    				  // to the unlocked pool when released.
    				  audioNode._unlocked = true;
    	  
    				  // Add the audio node to the pool.
    				  self._releaseHtml5Audio(audioNode);
    				} catch (e) {
    				  self.noAudio = true;
    				  break;
    				}
    			  }
    	  
    			  // Loop through any assigned audio nodes and unlock them.
    			  for (var i=0; i<self._howls.length; i++) {
    				if (!self._howls[i]._webAudio) {
    				  // Get all of the sounds in this Howl group.
    				  var ids = self._howls[i]._getSoundIds();
    	  
    				  // Loop through all sounds and unlock the audio nodes.
    				  for (var j=0; j<ids.length; j++) {
    					var sound = self._howls[i]._soundById(ids[j]);
    	  
    					if (sound && sound._node && !sound._node._unlocked) {
    					  sound._node._unlocked = true;
    					  sound._node.load();
    					}
    				  }
    				}
    			  }
    	  
    			  // Fix Android can not play in suspend state.
    			  self._autoResume();
    	  
    			  // Create an empty buffer.
    			  var source = self.ctx.createBufferSource();
    			  source.buffer = self._scratchBuffer;
    			  source.connect(self.ctx.destination);
    	  
    			  // Play the empty buffer.
    			  if (typeof source.start === 'undefined') {
    				source.noteOn(0);
    			  } else {
    				source.start(0);
    			  }
    	  
    			  // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
    			  if (typeof self.ctx.resume === 'function') {
    				self.ctx.resume();
    			  }
    	  
    			  // Setup a timeout to check that we are unlocked on the next event loop.
    			  source.onended = function() {
    				source.disconnect(0);
    	  
    				// Update the unlocked state and prevent this check from happening again.
    				self._audioUnlocked = true;
    	  
    				// Remove the touch start listener.
    				document.removeEventListener('touchstart', unlock, true);
    				document.removeEventListener('touchend', unlock, true);
    				document.removeEventListener('click', unlock, true);
    				document.removeEventListener('keydown', unlock, true);
    	  
    				// Let all sounds know that audio has been unlocked.
    				for (var i=0; i<self._howls.length; i++) {
    				  self._howls[i]._emit('unlock');
    				}
    			  };
    			};
    	  
    			// Setup a touch start listener to attempt an unlock in.
    			document.addEventListener('touchstart', unlock, true);
    			document.addEventListener('touchend', unlock, true);
    			document.addEventListener('click', unlock, true);
    			document.addEventListener('keydown', unlock, true);
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Get an unlocked HTML5 Audio object from the pool. If none are left,
    		   * return a new Audio object and throw a warning.
    		   * @return {Audio} HTML5 Audio object.
    		   */
    		  _obtainHtml5Audio: function() {
    			var self = this || Howler;
    	  
    			// Return the next object from the pool if one exists.
    			if (self._html5AudioPool.length) {
    			  return self._html5AudioPool.pop();
    			}
    	  
    			//.Check if the audio is locked and throw a warning.
    			var testPlay = new Audio().play();
    			if (testPlay && typeof Promise !== 'undefined' && (testPlay instanceof Promise || typeof testPlay.then === 'function')) {
    			  testPlay.catch(function() {
    				console.warn('HTML5 Audio pool exhausted, returning potentially locked audio object.');
    			  });
    			}
    	  
    			return new Audio();
    		  },
    	  
    		  /**
    		   * Return an activated HTML5 Audio object to the pool.
    		   * @return {Howler}
    		   */
    		  _releaseHtml5Audio: function(audio) {
    			var self = this || Howler;
    	  
    			// Don't add audio to the pool if we don't know if it has been unlocked.
    			if (audio._unlocked) {
    			  self._html5AudioPool.push(audio);
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Automatically suspend the Web Audio AudioContext after no sound has played for 30 seconds.
    		   * This saves processing/energy and fixes various browser-specific bugs with audio getting stuck.
    		   * @return {Howler}
    		   */
    		  _autoSuspend: function() {
    			var self = this;
    	  
    			if (!self.autoSuspend || !self.ctx || typeof self.ctx.suspend === 'undefined' || !Howler.usingWebAudio) {
    			  return;
    			}
    	  
    			// Check if any sounds are playing.
    			for (var i=0; i<self._howls.length; i++) {
    			  if (self._howls[i]._webAudio) {
    				for (var j=0; j<self._howls[i]._sounds.length; j++) {
    				  if (!self._howls[i]._sounds[j]._paused) {
    					return self;
    				  }
    				}
    			  }
    			}
    	  
    			if (self._suspendTimer) {
    			  clearTimeout(self._suspendTimer);
    			}
    	  
    			// If no sound has played after 30 seconds, suspend the context.
    			self._suspendTimer = setTimeout(function() {
    			  if (!self.autoSuspend) {
    				return;
    			  }
    	  
    			  self._suspendTimer = null;
    			  self.state = 'suspending';
    	  
    			  // Handle updating the state of the audio context after suspending.
    			  var handleSuspension = function() {
    				self.state = 'suspended';
    	  
    				if (self._resumeAfterSuspend) {
    				  delete self._resumeAfterSuspend;
    				  self._autoResume();
    				}
    			  };
    	  
    			  // Either the state gets suspended or it is interrupted.
    			  // Either way, we need to update the state to suspended.
    			  self.ctx.suspend().then(handleSuspension, handleSuspension);
    			}, 30000);
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Automatically resume the Web Audio AudioContext when a new sound is played.
    		   * @return {Howler}
    		   */
    		  _autoResume: function() {
    			var self = this;
    	  
    			if (!self.ctx || typeof self.ctx.resume === 'undefined' || !Howler.usingWebAudio) {
    			  return;
    			}
    	  
    			if (self.state === 'running' && self.ctx.state !== 'interrupted' && self._suspendTimer) {
    			  clearTimeout(self._suspendTimer);
    			  self._suspendTimer = null;
    			} else if (self.state === 'suspended' || self.state === 'running' && self.ctx.state === 'interrupted') {
    			  self.ctx.resume().then(function() {
    				self.state = 'running';
    	  
    				// Emit to all Howls that the audio has resumed.
    				for (var i=0; i<self._howls.length; i++) {
    				  self._howls[i]._emit('resume');
    				}
    			  });
    	  
    			  if (self._suspendTimer) {
    				clearTimeout(self._suspendTimer);
    				self._suspendTimer = null;
    			  }
    			} else if (self.state === 'suspending') {
    			  self._resumeAfterSuspend = true;
    			}
    	  
    			return self;
    		  }
    		};
    	  
    		// Setup the global audio controller.
    		var Howler = new HowlerGlobal();
    	  
    		/** Group Methods **/
    		/***************************************************************************/
    	  
    		/**
    		 * Create an audio group controller.
    		 * @param {Object} o Passed in properties for this group.
    		 */
    		var Howl = function(o) {
    		  var self = this;
    	  
    		  // Throw an error if no source is provided.
    		  if (!o.src || o.src.length === 0) {
    			console.error('An array of source files must be passed with any new Howl.');
    			return;
    		  }
    	  
    		  self.init(o);
    		};
    		Howl.prototype = {
    		  /**
    		   * Initialize a new Howl group object.
    		   * @param  {Object} o Passed in properties for this group.
    		   * @return {Howl}
    		   */
    		  init: function(o) {
    			var self = this;
    	  
    			// If we don't have an AudioContext created yet, run the setup.
    			if (!Howler.ctx) {
    			  setupAudioContext();
    			}
    	  
    			// Setup user-defined default properties.
    			self._autoplay = o.autoplay || false;
    			self._format = (typeof o.format !== 'string') ? o.format : [o.format];
    			self._html5 = o.html5 || false;
    			self._muted = o.mute || false;
    			self._loop = o.loop || false;
    			self._pool = o.pool || 5;
    			self._preload = (typeof o.preload === 'boolean' || o.preload === 'metadata') ? o.preload : true;
    			self._rate = o.rate || 1;
    			self._sprite = o.sprite || {};
    			self._src = (typeof o.src !== 'string') ? o.src : [o.src];
    			self._volume = o.volume !== undefined ? o.volume : 1;
    			self._xhr = {
    			  method: o.xhr && o.xhr.method ? o.xhr.method : 'GET',
    			  headers: o.xhr && o.xhr.headers ? o.xhr.headers : null,
    			  withCredentials: o.xhr && o.xhr.withCredentials ? o.xhr.withCredentials : false,
    			};
    	  
    			// Setup all other default properties.
    			self._duration = 0;
    			self._state = 'unloaded';
    			self._sounds = [];
    			self._endTimers = {};
    			self._queue = [];
    			self._playLock = false;
    	  
    			// Setup event listeners.
    			self._onend = o.onend ? [{fn: o.onend}] : [];
    			self._onfade = o.onfade ? [{fn: o.onfade}] : [];
    			self._onload = o.onload ? [{fn: o.onload}] : [];
    			self._onloaderror = o.onloaderror ? [{fn: o.onloaderror}] : [];
    			self._onplayerror = o.onplayerror ? [{fn: o.onplayerror}] : [];
    			self._onpause = o.onpause ? [{fn: o.onpause}] : [];
    			self._onplay = o.onplay ? [{fn: o.onplay}] : [];
    			self._onstop = o.onstop ? [{fn: o.onstop}] : [];
    			self._onmute = o.onmute ? [{fn: o.onmute}] : [];
    			self._onvolume = o.onvolume ? [{fn: o.onvolume}] : [];
    			self._onrate = o.onrate ? [{fn: o.onrate}] : [];
    			self._onseek = o.onseek ? [{fn: o.onseek}] : [];
    			self._onunlock = o.onunlock ? [{fn: o.onunlock}] : [];
    			self._onresume = [];
    	  
    			// Web Audio or HTML5 Audio?
    			self._webAudio = Howler.usingWebAudio && !self._html5;
    	  
    			// Automatically try to enable audio.
    			if (typeof Howler.ctx !== 'undefined' && Howler.ctx && Howler.autoUnlock) {
    			  Howler._unlockAudio();
    			}
    	  
    			// Keep track of this Howl group in the global controller.
    			Howler._howls.push(self);
    	  
    			// If they selected autoplay, add a play event to the load queue.
    			if (self._autoplay) {
    			  self._queue.push({
    				event: 'play',
    				action: function() {
    				  self.play();
    				}
    			  });
    			}
    	  
    			// Load the source file unless otherwise specified.
    			if (self._preload && self._preload !== 'none') {
    			  self.load();
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Load the audio file.
    		   * @return {Howler}
    		   */
    		  load: function() {
    			var self = this;
    			var url = null;
    	  
    			// If no audio is available, quit immediately.
    			if (Howler.noAudio) {
    			  self._emit('loaderror', null, 'No audio support.');
    			  return;
    			}
    	  
    			// Make sure our source is in an array.
    			if (typeof self._src === 'string') {
    			  self._src = [self._src];
    			}
    	  
    			// Loop through the sources and pick the first one that is compatible.
    			for (var i=0; i<self._src.length; i++) {
    			  var ext, str;
    	  
    			  if (self._format && self._format[i]) {
    				// If an extension was specified, use that instead.
    				ext = self._format[i];
    			  } else {
    				// Make sure the source is a string.
    				str = self._src[i];
    				if (typeof str !== 'string') {
    				  self._emit('loaderror', null, 'Non-string found in selected audio sources - ignoring.');
    				  continue;
    				}
    	  
    				// Extract the file extension from the URL or base64 data URI.
    				ext = /^data:audio\/([^;,]+);/i.exec(str);
    				if (!ext) {
    				  ext = /\.([^.]+)$/.exec(str.split('?', 1)[0]);
    				}
    	  
    				if (ext) {
    				  ext = ext[1].toLowerCase();
    				}
    			  }
    	  
    			  // Log a warning if no extension was found.
    			  if (!ext) {
    				console.warn('No file extension was found. Consider using the "format" property or specify an extension.');
    			  }
    	  
    			  // Check if this extension is available.
    			  if (ext && Howler.codecs(ext)) {
    				url = self._src[i];
    				break;
    			  }
    			}
    	  
    			if (!url) {
    			  self._emit('loaderror', null, 'No codec support for selected audio sources.');
    			  return;
    			}
    	  
    			self._src = url;
    			self._state = 'loading';
    	  
    			// If the hosting page is HTTPS and the source isn't,
    			// drop down to HTML5 Audio to avoid Mixed Content errors.
    			if (window.location.protocol === 'https:' && url.slice(0, 5) === 'http:') {
    			  self._html5 = true;
    			  self._webAudio = false;
    			}
    	  
    			// Create a new sound object and add it to the pool.
    			new Sound(self);
    	  
    			// Load and decode the audio data for playback.
    			if (self._webAudio) {
    			  loadBuffer(self);
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Play a sound or resume previous playback.
    		   * @param  {String/Number} sprite   Sprite name for sprite playback or sound id to continue previous.
    		   * @param  {Boolean} internal Internal Use: true prevents event firing.
    		   * @return {Number}          Sound ID.
    		   */
    		  play: function(sprite, internal) {
    			var self = this;
    			var id = null;
    	  
    			// Determine if a sprite, sound id or nothing was passed
    			if (typeof sprite === 'number') {
    			  id = sprite;
    			  sprite = null;
    			} else if (typeof sprite === 'string' && self._state === 'loaded' && !self._sprite[sprite]) {
    			  // If the passed sprite doesn't exist, do nothing.
    			  return null;
    			} else if (typeof sprite === 'undefined') {
    			  // Use the default sound sprite (plays the full audio length).
    			  sprite = '__default';
    	  
    			  // Check if there is a single paused sound that isn't ended.
    			  // If there is, play that sound. If not, continue as usual.
    			  if (!self._playLock) {
    				var num = 0;
    				for (var i=0; i<self._sounds.length; i++) {
    				  if (self._sounds[i]._paused && !self._sounds[i]._ended) {
    					num++;
    					id = self._sounds[i]._id;
    				  }
    				}
    	  
    				if (num === 1) {
    				  sprite = null;
    				} else {
    				  id = null;
    				}
    			  }
    			}
    	  
    			// Get the selected node, or get one from the pool.
    			var sound = id ? self._soundById(id) : self._inactiveSound();
    	  
    			// If the sound doesn't exist, do nothing.
    			if (!sound) {
    			  return null;
    			}
    	  
    			// Select the sprite definition.
    			if (id && !sprite) {
    			  sprite = sound._sprite || '__default';
    			}
    	  
    			// If the sound hasn't loaded, we must wait to get the audio's duration.
    			// We also need to wait to make sure we don't run into race conditions with
    			// the order of function calls.
    			if (self._state !== 'loaded') {
    			  // Set the sprite value on this sound.
    			  sound._sprite = sprite;
    	  
    			  // Mark this sound as not ended in case another sound is played before this one loads.
    			  sound._ended = false;
    	  
    			  // Add the sound to the queue to be played on load.
    			  var soundId = sound._id;
    			  self._queue.push({
    				event: 'play',
    				action: function() {
    				  self.play(soundId);
    				}
    			  });
    	  
    			  return soundId;
    			}
    	  
    			// Don't play the sound if an id was passed and it is already playing.
    			if (id && !sound._paused) {
    			  // Trigger the play event, in order to keep iterating through queue.
    			  if (!internal) {
    				self._loadQueue('play');
    			  }
    	  
    			  return sound._id;
    			}
    	  
    			// Make sure the AudioContext isn't suspended, and resume it if it is.
    			if (self._webAudio) {
    			  Howler._autoResume();
    			}
    	  
    			// Determine how long to play for and where to start playing.
    			var seek = Math.max(0, sound._seek > 0 ? sound._seek : self._sprite[sprite][0] / 1000);
    			var duration = Math.max(0, ((self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000) - seek);
    			var timeout = (duration * 1000) / Math.abs(sound._rate);
    			var start = self._sprite[sprite][0] / 1000;
    			var stop = (self._sprite[sprite][0] + self._sprite[sprite][1]) / 1000;
    			sound._sprite = sprite;
    	  
    			// Mark the sound as ended instantly so that this async playback
    			// doesn't get grabbed by another call to play while this one waits to start.
    			sound._ended = false;
    	  
    			// Update the parameters of the sound.
    			var setParams = function() {
    			  sound._paused = false;
    			  sound._seek = seek;
    			  sound._start = start;
    			  sound._stop = stop;
    			  sound._loop = !!(sound._loop || self._sprite[sprite][2]);
    			};
    	  
    			// End the sound instantly if seek is at the end.
    			if (seek >= stop) {
    			  self._ended(sound);
    			  return;
    			}
    	  
    			// Begin the actual playback.
    			var node = sound._node;
    			if (self._webAudio) {
    			  // Fire this when the sound is ready to play to begin Web Audio playback.
    			  var playWebAudio = function() {
    				self._playLock = false;
    				setParams();
    				self._refreshBuffer(sound);
    	  
    				// Setup the playback params.
    				var vol = (sound._muted || self._muted) ? 0 : sound._volume;
    				node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
    				sound._playStart = Howler.ctx.currentTime;
    	  
    				// Play the sound using the supported method.
    				if (typeof node.bufferSource.start === 'undefined') {
    				  sound._loop ? node.bufferSource.noteGrainOn(0, seek, 86400) : node.bufferSource.noteGrainOn(0, seek, duration);
    				} else {
    				  sound._loop ? node.bufferSource.start(0, seek, 86400) : node.bufferSource.start(0, seek, duration);
    				}
    	  
    				// Start a new timer if none is present.
    				if (timeout !== Infinity) {
    				  self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
    				}
    	  
    				if (!internal) {
    				  setTimeout(function() {
    					self._emit('play', sound._id);
    					self._loadQueue();
    				  }, 0);
    				}
    			  };
    	  
    			  if (Howler.state === 'running' && Howler.ctx.state !== 'interrupted') {
    				playWebAudio();
    			  } else {
    				self._playLock = true;
    	  
    				// Wait for the audio context to resume before playing.
    				self.once('resume', playWebAudio);
    	  
    				// Cancel the end timer.
    				self._clearTimer(sound._id);
    			  }
    			} else {
    			  // Fire this when the sound is ready to play to begin HTML5 Audio playback.
    			  var playHtml5 = function() {
    				node.currentTime = seek;
    				node.muted = sound._muted || self._muted || Howler._muted || node.muted;
    				node.volume = sound._volume * Howler.volume();
    				node.playbackRate = sound._rate;
    	  
    				// Some browsers will throw an error if this is called without user interaction.
    				try {
    				  var play = node.play();
    	  
    				  // Support older browsers that don't support promises, and thus don't have this issue.
    				  if (play && typeof Promise !== 'undefined' && (play instanceof Promise || typeof play.then === 'function')) {
    					// Implements a lock to prevent DOMException: The play() request was interrupted by a call to pause().
    					self._playLock = true;
    	  
    					// Set param values immediately.
    					setParams();
    	  
    					// Releases the lock and executes queued actions.
    					play
    					  .then(function() {
    						self._playLock = false;
    						node._unlocked = true;
    						if (!internal) {
    						  self._emit('play', sound._id);
    						} else {
    						  self._loadQueue();
    						}
    					  })
    					  .catch(function() {
    						self._playLock = false;
    						self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
    						  'on mobile devices and Chrome where playback was not within a user interaction.');
    	  
    						// Reset the ended and paused values.
    						sound._ended = true;
    						sound._paused = true;
    					  });
    				  } else if (!internal) {
    					self._playLock = false;
    					setParams();
    					self._emit('play', sound._id);
    				  }
    	  
    				  // Setting rate before playing won't work in IE, so we set it again here.
    				  node.playbackRate = sound._rate;
    	  
    				  // If the node is still paused, then we can assume there was a playback issue.
    				  if (node.paused) {
    					self._emit('playerror', sound._id, 'Playback was unable to start. This is most commonly an issue ' +
    					  'on mobile devices and Chrome where playback was not within a user interaction.');
    					return;
    				  }
    	  
    				  // Setup the end timer on sprites or listen for the ended event.
    				  if (sprite !== '__default' || sound._loop) {
    					self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
    				  } else {
    					self._endTimers[sound._id] = function() {
    					  // Fire ended on this audio node.
    					  self._ended(sound);
    	  
    					  // Clear this listener.
    					  node.removeEventListener('ended', self._endTimers[sound._id], false);
    					};
    					node.addEventListener('ended', self._endTimers[sound._id], false);
    				  }
    				} catch (err) {
    				  self._emit('playerror', sound._id, err);
    				}
    			  };
    	  
    			  // If this is streaming audio, make sure the src is set and load again.
    			  if (node.src === 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA') {
    				node.src = self._src;
    				node.load();
    			  }
    	  
    			  // Play immediately if ready, or wait for the 'canplaythrough'e vent.
    			  var loadedNoReadyState = (window && window.ejecta) || (!node.readyState && Howler._navigator.isCocoonJS);
    			  if (node.readyState >= 3 || loadedNoReadyState) {
    				playHtml5();
    			  } else {
    				self._playLock = true;
    				self._state = 'loading';
    	  
    				var listener = function() {
    				  self._state = 'loaded';
    				  
    				  // Begin playback.
    				  playHtml5();
    	  
    				  // Clear this listener.
    				  node.removeEventListener(Howler._canPlayEvent, listener, false);
    				};
    				node.addEventListener(Howler._canPlayEvent, listener, false);
    	  
    				// Cancel the end timer.
    				self._clearTimer(sound._id);
    			  }
    			}
    	  
    			return sound._id;
    		  },
    	  
    		  /**
    		   * Pause playback and save current position.
    		   * @param  {Number} id The sound ID (empty to pause all in group).
    		   * @return {Howl}
    		   */
    		  pause: function(id) {
    			var self = this;
    	  
    			// If the sound hasn't loaded or a play() promise is pending, add it to the load queue to pause when capable.
    			if (self._state !== 'loaded' || self._playLock) {
    			  self._queue.push({
    				event: 'pause',
    				action: function() {
    				  self.pause(id);
    				}
    			  });
    	  
    			  return self;
    			}
    	  
    			// If no id is passed, get all ID's to be paused.
    			var ids = self._getSoundIds(id);
    	  
    			for (var i=0; i<ids.length; i++) {
    			  // Clear the end timer.
    			  self._clearTimer(ids[i]);
    	  
    			  // Get the sound.
    			  var sound = self._soundById(ids[i]);
    	  
    			  if (sound && !sound._paused) {
    				// Reset the seek position.
    				sound._seek = self.seek(ids[i]);
    				sound._rateSeek = 0;
    				sound._paused = true;
    	  
    				// Stop currently running fades.
    				self._stopFade(ids[i]);
    	  
    				if (sound._node) {
    				  if (self._webAudio) {
    					// Make sure the sound has been created.
    					if (!sound._node.bufferSource) {
    					  continue;
    					}
    	  
    					if (typeof sound._node.bufferSource.stop === 'undefined') {
    					  sound._node.bufferSource.noteOff(0);
    					} else {
    					  sound._node.bufferSource.stop(0);
    					}
    	  
    					// Clean up the buffer source.
    					self._cleanBuffer(sound._node);
    				  } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
    					sound._node.pause();
    				  }
    				}
    			  }
    	  
    			  // Fire the pause event, unless `true` is passed as the 2nd argument.
    			  if (!arguments[1]) {
    				self._emit('pause', sound ? sound._id : null);
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Stop playback and reset to start.
    		   * @param  {Number} id The sound ID (empty to stop all in group).
    		   * @param  {Boolean} internal Internal Use: true prevents event firing.
    		   * @return {Howl}
    		   */
    		  stop: function(id, internal) {
    			var self = this;
    	  
    			// If the sound hasn't loaded, add it to the load queue to stop when capable.
    			if (self._state !== 'loaded' || self._playLock) {
    			  self._queue.push({
    				event: 'stop',
    				action: function() {
    				  self.stop(id);
    				}
    			  });
    	  
    			  return self;
    			}
    	  
    			// If no id is passed, get all ID's to be stopped.
    			var ids = self._getSoundIds(id);
    	  
    			for (var i=0; i<ids.length; i++) {
    			  // Clear the end timer.
    			  self._clearTimer(ids[i]);
    	  
    			  // Get the sound.
    			  var sound = self._soundById(ids[i]);
    	  
    			  if (sound) {
    				// Reset the seek position.
    				sound._seek = sound._start || 0;
    				sound._rateSeek = 0;
    				sound._paused = true;
    				sound._ended = true;
    	  
    				// Stop currently running fades.
    				self._stopFade(ids[i]);
    	  
    				if (sound._node) {
    				  if (self._webAudio) {
    					// Make sure the sound's AudioBufferSourceNode has been created.
    					if (sound._node.bufferSource) {
    					  if (typeof sound._node.bufferSource.stop === 'undefined') {
    						sound._node.bufferSource.noteOff(0);
    					  } else {
    						sound._node.bufferSource.stop(0);
    					  }
    	  
    					  // Clean up the buffer source.
    					  self._cleanBuffer(sound._node);
    					}
    				  } else if (!isNaN(sound._node.duration) || sound._node.duration === Infinity) {
    					sound._node.currentTime = sound._start || 0;
    					sound._node.pause();
    	  
    					// If this is a live stream, stop download once the audio is stopped.
    					if (sound._node.duration === Infinity) {
    					  self._clearSound(sound._node);
    					}
    				  }
    				}
    	  
    				if (!internal) {
    				  self._emit('stop', sound._id);
    				}
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Mute/unmute a single sound or all sounds in this Howl group.
    		   * @param  {Boolean} muted Set to true to mute and false to unmute.
    		   * @param  {Number} id    The sound ID to update (omit to mute/unmute all).
    		   * @return {Howl}
    		   */
    		  mute: function(muted, id) {
    			var self = this;
    	  
    			// If the sound hasn't loaded, add it to the load queue to mute when capable.
    			if (self._state !== 'loaded'|| self._playLock) {
    			  self._queue.push({
    				event: 'mute',
    				action: function() {
    				  self.mute(muted, id);
    				}
    			  });
    	  
    			  return self;
    			}
    	  
    			// If applying mute/unmute to all sounds, update the group's value.
    			if (typeof id === 'undefined') {
    			  if (typeof muted === 'boolean') {
    				self._muted = muted;
    			  } else {
    				return self._muted;
    			  }
    			}
    	  
    			// If no id is passed, get all ID's to be muted.
    			var ids = self._getSoundIds(id);
    	  
    			for (var i=0; i<ids.length; i++) {
    			  // Get the sound.
    			  var sound = self._soundById(ids[i]);
    	  
    			  if (sound) {
    				sound._muted = muted;
    	  
    				// Cancel active fade and set the volume to the end value.
    				if (sound._interval) {
    				  self._stopFade(sound._id);
    				}
    	  
    				if (self._webAudio && sound._node) {
    				  sound._node.gain.setValueAtTime(muted ? 0 : sound._volume, Howler.ctx.currentTime);
    				} else if (sound._node) {
    				  sound._node.muted = Howler._muted ? true : muted;
    				}
    	  
    				self._emit('mute', sound._id);
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Get/set the volume of this sound or of the Howl group. This method can optionally take 0, 1 or 2 arguments.
    		   *   volume() -> Returns the group's volume value.
    		   *   volume(id) -> Returns the sound id's current volume.
    		   *   volume(vol) -> Sets the volume of all sounds in this Howl group.
    		   *   volume(vol, id) -> Sets the volume of passed sound id.
    		   * @return {Howl/Number} Returns self or current volume.
    		   */
    		  volume: function() {
    			var self = this;
    			var args = arguments;
    			var vol, id;
    	  
    			// Determine the values based on arguments.
    			if (args.length === 0) {
    			  // Return the value of the groups' volume.
    			  return self._volume;
    			} else if (args.length === 1 || args.length === 2 && typeof args[1] === 'undefined') {
    			  // First check if this is an ID, and if not, assume it is a new volume.
    			  var ids = self._getSoundIds();
    			  var index = ids.indexOf(args[0]);
    			  if (index >= 0) {
    				id = parseInt(args[0], 10);
    			  } else {
    				vol = parseFloat(args[0]);
    			  }
    			} else if (args.length >= 2) {
    			  vol = parseFloat(args[0]);
    			  id = parseInt(args[1], 10);
    			}
    	  
    			// Update the volume or return the current volume.
    			var sound;
    			if (typeof vol !== 'undefined' && vol >= 0 && vol <= 1) {
    			  // If the sound hasn't loaded, add it to the load queue to change volume when capable.
    			  if (self._state !== 'loaded'|| self._playLock) {
    				self._queue.push({
    				  event: 'volume',
    				  action: function() {
    					self.volume.apply(self, args);
    				  }
    				});
    	  
    				return self;
    			  }
    	  
    			  // Set the group volume.
    			  if (typeof id === 'undefined') {
    				self._volume = vol;
    			  }
    	  
    			  // Update one or all volumes.
    			  id = self._getSoundIds(id);
    			  for (var i=0; i<id.length; i++) {
    				// Get the sound.
    				sound = self._soundById(id[i]);
    	  
    				if (sound) {
    				  sound._volume = vol;
    	  
    				  // Stop currently running fades.
    				  if (!args[2]) {
    					self._stopFade(id[i]);
    				  }
    	  
    				  if (self._webAudio && sound._node && !sound._muted) {
    					sound._node.gain.setValueAtTime(vol, Howler.ctx.currentTime);
    				  } else if (sound._node && !sound._muted) {
    					sound._node.volume = vol * Howler.volume();
    				  }
    	  
    				  self._emit('volume', sound._id);
    				}
    			  }
    			} else {
    			  sound = id ? self._soundById(id) : self._sounds[0];
    			  return sound ? sound._volume : 0;
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Fade a currently playing sound between two volumes (if no id is passed, all sounds will fade).
    		   * @param  {Number} from The value to fade from (0.0 to 1.0).
    		   * @param  {Number} to   The volume to fade to (0.0 to 1.0).
    		   * @param  {Number} len  Time in milliseconds to fade.
    		   * @param  {Number} id   The sound id (omit to fade all sounds).
    		   * @return {Howl}
    		   */
    		  fade: function(from, to, len, id) {
    			var self = this;
    	  
    			// If the sound hasn't loaded, add it to the load queue to fade when capable.
    			if (self._state !== 'loaded' || self._playLock) {
    			  self._queue.push({
    				event: 'fade',
    				action: function() {
    				  self.fade(from, to, len, id);
    				}
    			  });
    	  
    			  return self;
    			}
    	  
    			// Make sure the to/from/len values are numbers.
    			from = Math.min(Math.max(0, parseFloat(from)), 1);
    			to = Math.min(Math.max(0, parseFloat(to)), 1);
    			len = parseFloat(len);
    	  
    			// Set the volume to the start position.
    			self.volume(from, id);
    	  
    			// Fade the volume of one or all sounds.
    			var ids = self._getSoundIds(id);
    			for (var i=0; i<ids.length; i++) {
    			  // Get the sound.
    			  var sound = self._soundById(ids[i]);
    	  
    			  // Create a linear fade or fall back to timeouts with HTML5 Audio.
    			  if (sound) {
    				// Stop the previous fade if no sprite is being used (otherwise, volume handles this).
    				if (!id) {
    				  self._stopFade(ids[i]);
    				}
    	  
    				// If we are using Web Audio, let the native methods do the actual fade.
    				if (self._webAudio && !sound._muted) {
    				  var currentTime = Howler.ctx.currentTime;
    				  var end = currentTime + (len / 1000);
    				  sound._volume = from;
    				  sound._node.gain.setValueAtTime(from, currentTime);
    				  sound._node.gain.linearRampToValueAtTime(to, end);
    				}
    	  
    				self._startFadeInterval(sound, from, to, len, ids[i], typeof id === 'undefined');
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Starts the internal interval to fade a sound.
    		   * @param  {Object} sound Reference to sound to fade.
    		   * @param  {Number} from The value to fade from (0.0 to 1.0).
    		   * @param  {Number} to   The volume to fade to (0.0 to 1.0).
    		   * @param  {Number} len  Time in milliseconds to fade.
    		   * @param  {Number} id   The sound id to fade.
    		   * @param  {Boolean} isGroup   If true, set the volume on the group.
    		   */
    		  _startFadeInterval: function(sound, from, to, len, id, isGroup) {
    			var self = this;
    			var vol = from;
    			var diff = to - from;
    			var steps = Math.abs(diff / 0.01);
    			var stepLen = Math.max(4, (steps > 0) ? len / steps : len);
    			var lastTick = Date.now();
    	  
    			// Store the value being faded to.
    			sound._fadeTo = to;
    	  
    			// Update the volume value on each interval tick.
    			sound._interval = setInterval(function() {
    			  // Update the volume based on the time since the last tick.
    			  var tick = (Date.now() - lastTick) / len;
    			  lastTick = Date.now();
    			  vol += diff * tick;
    	  
    			  // Round to within 2 decimal points.
    			  vol = Math.round(vol * 100) / 100;
    	  
    			  // Make sure the volume is in the right bounds.
    			  if (diff < 0) {
    				vol = Math.max(to, vol);
    			  } else {
    				vol = Math.min(to, vol);
    			  }
    	  
    			  // Change the volume.
    			  if (self._webAudio) {
    				sound._volume = vol;
    			  } else {
    				self.volume(vol, sound._id, true);
    			  }
    	  
    			  // Set the group's volume.
    			  if (isGroup) {
    				self._volume = vol;
    			  }
    	  
    			  // When the fade is complete, stop it and fire event.
    			  if ((to < from && vol <= to) || (to > from && vol >= to)) {
    				clearInterval(sound._interval);
    				sound._interval = null;
    				sound._fadeTo = null;
    				self.volume(to, sound._id);
    				self._emit('fade', sound._id);
    			  }
    			}, stepLen);
    		  },
    	  
    		  /**
    		   * Internal method that stops the currently playing fade when
    		   * a new fade starts, volume is changed or the sound is stopped.
    		   * @param  {Number} id The sound id.
    		   * @return {Howl}
    		   */
    		  _stopFade: function(id) {
    			var self = this;
    			var sound = self._soundById(id);
    	  
    			if (sound && sound._interval) {
    			  if (self._webAudio) {
    				sound._node.gain.cancelScheduledValues(Howler.ctx.currentTime);
    			  }
    	  
    			  clearInterval(sound._interval);
    			  sound._interval = null;
    			  self.volume(sound._fadeTo, id);
    			  sound._fadeTo = null;
    			  self._emit('fade', id);
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Get/set the loop parameter on a sound. This method can optionally take 0, 1 or 2 arguments.
    		   *   loop() -> Returns the group's loop value.
    		   *   loop(id) -> Returns the sound id's loop value.
    		   *   loop(loop) -> Sets the loop value for all sounds in this Howl group.
    		   *   loop(loop, id) -> Sets the loop value of passed sound id.
    		   * @return {Howl/Boolean} Returns self or current loop value.
    		   */
    		  loop: function() {
    			var self = this;
    			var args = arguments;
    			var loop, id, sound;
    	  
    			// Determine the values for loop and id.
    			if (args.length === 0) {
    			  // Return the grou's loop value.
    			  return self._loop;
    			} else if (args.length === 1) {
    			  if (typeof args[0] === 'boolean') {
    				loop = args[0];
    				self._loop = loop;
    			  } else {
    				// Return this sound's loop value.
    				sound = self._soundById(parseInt(args[0], 10));
    				return sound ? sound._loop : false;
    			  }
    			} else if (args.length === 2) {
    			  loop = args[0];
    			  id = parseInt(args[1], 10);
    			}
    	  
    			// If no id is passed, get all ID's to be looped.
    			var ids = self._getSoundIds(id);
    			for (var i=0; i<ids.length; i++) {
    			  sound = self._soundById(ids[i]);
    	  
    			  if (sound) {
    				sound._loop = loop;
    				if (self._webAudio && sound._node && sound._node.bufferSource) {
    				  sound._node.bufferSource.loop = loop;
    				  if (loop) {
    					sound._node.bufferSource.loopStart = sound._start || 0;
    					sound._node.bufferSource.loopEnd = sound._stop;
    	  
    					// If playing, restart playback to ensure looping updates.
    					if (self.playing(ids[i])) {
    					  self.pause(ids[i], true);
    					  self.play(ids[i], true);
    					}
    				  }
    				}
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Get/set the playback rate of a sound. This method can optionally take 0, 1 or 2 arguments.
    		   *   rate() -> Returns the first sound node's current playback rate.
    		   *   rate(id) -> Returns the sound id's current playback rate.
    		   *   rate(rate) -> Sets the playback rate of all sounds in this Howl group.
    		   *   rate(rate, id) -> Sets the playback rate of passed sound id.
    		   * @return {Howl/Number} Returns self or the current playback rate.
    		   */
    		  rate: function() {
    			var self = this;
    			var args = arguments;
    			var rate, id;
    	  
    			// Determine the values based on arguments.
    			if (args.length === 0) {
    			  // We will simply return the current rate of the first node.
    			  id = self._sounds[0]._id;
    			} else if (args.length === 1) {
    			  // First check if this is an ID, and if not, assume it is a new rate value.
    			  var ids = self._getSoundIds();
    			  var index = ids.indexOf(args[0]);
    			  if (index >= 0) {
    				id = parseInt(args[0], 10);
    			  } else {
    				rate = parseFloat(args[0]);
    			  }
    			} else if (args.length === 2) {
    			  rate = parseFloat(args[0]);
    			  id = parseInt(args[1], 10);
    			}
    	  
    			// Update the playback rate or return the current value.
    			var sound;
    			if (typeof rate === 'number') {
    			  // If the sound hasn't loaded, add it to the load queue to change playback rate when capable.
    			  if (self._state !== 'loaded' || self._playLock) {
    				self._queue.push({
    				  event: 'rate',
    				  action: function() {
    					self.rate.apply(self, args);
    				  }
    				});
    	  
    				return self;
    			  }
    	  
    			  // Set the group rate.
    			  if (typeof id === 'undefined') {
    				self._rate = rate;
    			  }
    	  
    			  // Update one or all volumes.
    			  id = self._getSoundIds(id);
    			  for (var i=0; i<id.length; i++) {
    				// Get the sound.
    				sound = self._soundById(id[i]);
    	  
    				if (sound) {
    				  // Keep track of our position when the rate changed and update the playback
    				  // start position so we can properly adjust the seek position for time elapsed.
    				  if (self.playing(id[i])) {
    					sound._rateSeek = self.seek(id[i]);
    					sound._playStart = self._webAudio ? Howler.ctx.currentTime : sound._playStart;
    				  }
    				  sound._rate = rate;
    	  
    				  // Change the playback rate.
    				  if (self._webAudio && sound._node && sound._node.bufferSource) {
    					sound._node.bufferSource.playbackRate.setValueAtTime(rate, Howler.ctx.currentTime);
    				  } else if (sound._node) {
    					sound._node.playbackRate = rate;
    				  }
    	  
    				  // Reset the timers.
    				  var seek = self.seek(id[i]);
    				  var duration = ((self._sprite[sound._sprite][0] + self._sprite[sound._sprite][1]) / 1000) - seek;
    				  var timeout = (duration * 1000) / Math.abs(sound._rate);
    	  
    				  // Start a new end timer if sound is already playing.
    				  if (self._endTimers[id[i]] || !sound._paused) {
    					self._clearTimer(id[i]);
    					self._endTimers[id[i]] = setTimeout(self._ended.bind(self, sound), timeout);
    				  }
    	  
    				  self._emit('rate', sound._id);
    				}
    			  }
    			} else {
    			  sound = self._soundById(id);
    			  return sound ? sound._rate : self._rate;
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Get/set the seek position of a sound. This method can optionally take 0, 1 or 2 arguments.
    		   *   seek() -> Returns the first sound node's current seek position.
    		   *   seek(id) -> Returns the sound id's current seek position.
    		   *   seek(seek) -> Sets the seek position of the first sound node.
    		   *   seek(seek, id) -> Sets the seek position of passed sound id.
    		   * @return {Howl/Number} Returns self or the current seek position.
    		   */
    		  seek: function() {
    			var self = this;
    			var args = arguments;
    			var seek, id;
    	  
    			// Determine the values based on arguments.
    			if (args.length === 0) {
    			  // We will simply return the current position of the first node.
    			  if (self._sounds.length) {
    				id = self._sounds[0]._id;
    			  }
    			} else if (args.length === 1) {
    			  // First check if this is an ID, and if not, assume it is a new seek position.
    			  var ids = self._getSoundIds();
    			  var index = ids.indexOf(args[0]);
    			  if (index >= 0) {
    				id = parseInt(args[0], 10);
    			  } else if (self._sounds.length) {
    				id = self._sounds[0]._id;
    				seek = parseFloat(args[0]);
    			  }
    			} else if (args.length === 2) {
    			  seek = parseFloat(args[0]);
    			  id = parseInt(args[1], 10);
    			}
    	  
    			// If there is no ID, bail out.
    			if (typeof id === 'undefined') {
    			  return 0;
    			}
    	  
    			// If the sound hasn't loaded, add it to the load queue to seek when capable.
    			if (typeof seek === 'number' && (self._state !== 'loaded' || self._playLock)) {
    			  self._queue.push({
    				event: 'seek',
    				action: function() {
    				  self.seek.apply(self, args);
    				}
    			  });
    	  
    			  return self;
    			}
    	  
    			// Get the sound.
    			var sound = self._soundById(id);
    	  
    			if (sound) {
    			  if (typeof seek === 'number' && seek >= 0) {
    				// Pause the sound and update position for restarting playback.
    				var playing = self.playing(id);
    				if (playing) {
    				  self.pause(id, true);
    				}
    	  
    				// Move the position of the track and cancel timer.
    				sound._seek = seek;
    				sound._ended = false;
    				self._clearTimer(id);
    	  
    				// Update the seek position for HTML5 Audio.
    				if (!self._webAudio && sound._node && !isNaN(sound._node.duration)) {
    				  sound._node.currentTime = seek;
    				}
    	  
    				// Seek and emit when ready.
    				var seekAndEmit = function() {
    				  // Restart the playback if the sound was playing.
    				  if (playing) {
    					self.play(id, true);
    				  }
    	  
    				  self._emit('seek', id);
    				};
    	  
    				// Wait for the play lock to be unset before emitting (HTML5 Audio).
    				if (playing && !self._webAudio) {
    				  var emitSeek = function() {
    					if (!self._playLock) {
    					  seekAndEmit();
    					} else {
    					  setTimeout(emitSeek, 0);
    					}
    				  };
    				  setTimeout(emitSeek, 0);
    				} else {
    				  seekAndEmit();
    				}
    			  } else {
    				if (self._webAudio) {
    				  var realTime = self.playing(id) ? Howler.ctx.currentTime - sound._playStart : 0;
    				  var rateSeek = sound._rateSeek ? sound._rateSeek - sound._seek : 0;
    				  return sound._seek + (rateSeek + realTime * Math.abs(sound._rate));
    				} else {
    				  return sound._node.currentTime;
    				}
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Check if a specific sound is currently playing or not (if id is provided), or check if at least one of the sounds in the group is playing or not.
    		   * @param  {Number}  id The sound id to check. If none is passed, the whole sound group is checked.
    		   * @return {Boolean} True if playing and false if not.
    		   */
    		  playing: function(id) {
    			var self = this;
    	  
    			// Check the passed sound ID (if any).
    			if (typeof id === 'number') {
    			  var sound = self._soundById(id);
    			  return sound ? !sound._paused : false;
    			}
    	  
    			// Otherwise, loop through all sounds and check if any are playing.
    			for (var i=0; i<self._sounds.length; i++) {
    			  if (!self._sounds[i]._paused) {
    				return true;
    			  }
    			}
    	  
    			return false;
    		  },
    	  
    		  /**
    		   * Get the duration of this sound. Passing a sound id will return the sprite duration.
    		   * @param  {Number} id The sound id to check. If none is passed, return full source duration.
    		   * @return {Number} Audio duration in seconds.
    		   */
    		  duration: function(id) {
    			var self = this;
    			var duration = self._duration;
    	  
    			// If we pass an ID, get the sound and return the sprite length.
    			var sound = self._soundById(id);
    			if (sound) {
    			  duration = self._sprite[sound._sprite][1] / 1000;
    			}
    	  
    			return duration;
    		  },
    	  
    		  /**
    		   * Returns the current loaded state of this Howl.
    		   * @return {String} 'unloaded', 'loading', 'loaded'
    		   */
    		  state: function() {
    			return this._state;
    		  },
    	  
    		  /**
    		   * Unload and destroy the current Howl object.
    		   * This will immediately stop all sound instances attached to this group.
    		   */
    		  unload: function() {
    			var self = this;
    	  
    			// Stop playing any active sounds.
    			var sounds = self._sounds;
    			for (var i=0; i<sounds.length; i++) {
    			  // Stop the sound if it is currently playing.
    			  if (!sounds[i]._paused) {
    				self.stop(sounds[i]._id);
    			  }
    	  
    			  // Remove the source or disconnect.
    			  if (!self._webAudio) {
    				// Set the source to 0-second silence to stop any downloading (except in IE).
    				self._clearSound(sounds[i]._node);
    	  
    				// Remove any event listeners.
    				sounds[i]._node.removeEventListener('error', sounds[i]._errorFn, false);
    				sounds[i]._node.removeEventListener(Howler._canPlayEvent, sounds[i]._loadFn, false);
    				sounds[i]._node.removeEventListener('ended', sounds[i]._endFn, false);
    	  
    				// Release the Audio object back to the pool.
    				Howler._releaseHtml5Audio(sounds[i]._node);
    			  }
    	  
    			  // Empty out all of the nodes.
    			  delete sounds[i]._node;
    	  
    			  // Make sure all timers are cleared out.
    			  self._clearTimer(sounds[i]._id);
    			}
    	  
    			// Remove the references in the global Howler object.
    			var index = Howler._howls.indexOf(self);
    			if (index >= 0) {
    			  Howler._howls.splice(index, 1);
    			}
    	  
    			// Delete this sound from the cache (if no other Howl is using it).
    			var remCache = true;
    			for (i=0; i<Howler._howls.length; i++) {
    			  if (Howler._howls[i]._src === self._src || self._src.indexOf(Howler._howls[i]._src) >= 0) {
    				remCache = false;
    				break;
    			  }
    			}
    	  
    			if (cache && remCache) {
    			  delete cache[self._src];
    			}
    	  
    			// Clear global errors.
    			Howler.noAudio = false;
    	  
    			// Clear out `self`.
    			self._state = 'unloaded';
    			self._sounds = [];
    			self = null;
    	  
    			return null;
    		  },
    	  
    		  /**
    		   * Listen to a custom event.
    		   * @param  {String}   event Event name.
    		   * @param  {Function} fn    Listener to call.
    		   * @param  {Number}   id    (optional) Only listen to events for this sound.
    		   * @param  {Number}   once  (INTERNAL) Marks event to fire only once.
    		   * @return {Howl}
    		   */
    		  on: function(event, fn, id, once) {
    			var self = this;
    			var events = self['_on' + event];
    	  
    			if (typeof fn === 'function') {
    			  events.push(once ? {id: id, fn: fn, once: once} : {id: id, fn: fn});
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Remove a custom event. Call without parameters to remove all events.
    		   * @param  {String}   event Event name.
    		   * @param  {Function} fn    Listener to remove. Leave empty to remove all.
    		   * @param  {Number}   id    (optional) Only remove events for this sound.
    		   * @return {Howl}
    		   */
    		  off: function(event, fn, id) {
    			var self = this;
    			var events = self['_on' + event];
    			var i = 0;
    	  
    			// Allow passing just an event and ID.
    			if (typeof fn === 'number') {
    			  id = fn;
    			  fn = null;
    			}
    	  
    			if (fn || id) {
    			  // Loop through event store and remove the passed function.
    			  for (i=0; i<events.length; i++) {
    				var isId = (id === events[i].id);
    				if (fn === events[i].fn && isId || !fn && isId) {
    				  events.splice(i, 1);
    				  break;
    				}
    			  }
    			} else if (event) {
    			  // Clear out all events of this type.
    			  self['_on' + event] = [];
    			} else {
    			  // Clear out all events of every type.
    			  var keys = Object.keys(self);
    			  for (i=0; i<keys.length; i++) {
    				if ((keys[i].indexOf('_on') === 0) && Array.isArray(self[keys[i]])) {
    				  self[keys[i]] = [];
    				}
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Listen to a custom event and remove it once fired.
    		   * @param  {String}   event Event name.
    		   * @param  {Function} fn    Listener to call.
    		   * @param  {Number}   id    (optional) Only listen to events for this sound.
    		   * @return {Howl}
    		   */
    		  once: function(event, fn, id) {
    			var self = this;
    	  
    			// Setup the event listener.
    			self.on(event, fn, id, 1);
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Emit all events of a specific type and pass the sound id.
    		   * @param  {String} event Event name.
    		   * @param  {Number} id    Sound ID.
    		   * @param  {Number} msg   Message to go with event.
    		   * @return {Howl}
    		   */
    		  _emit: function(event, id, msg) {
    			var self = this;
    			var events = self['_on' + event];
    	  
    			// Loop through event store and fire all functions.
    			for (var i=events.length-1; i>=0; i--) {
    			  // Only fire the listener if the correct ID is used.
    			  if (!events[i].id || events[i].id === id || event === 'load') {
    				setTimeout(function(fn) {
    				  fn.call(this, id, msg);
    				}.bind(self, events[i].fn), 0);
    	  
    				// If this event was setup with `once`, remove it.
    				if (events[i].once) {
    				  self.off(event, events[i].fn, events[i].id);
    				}
    			  }
    			}
    	  
    			// Pass the event type into load queue so that it can continue stepping.
    			self._loadQueue(event);
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Queue of actions initiated before the sound has loaded.
    		   * These will be called in sequence, with the next only firing
    		   * after the previous has finished executing (even if async like play).
    		   * @return {Howl}
    		   */
    		  _loadQueue: function(event) {
    			var self = this;
    	  
    			if (self._queue.length > 0) {
    			  var task = self._queue[0];
    	  
    			  // Remove this task if a matching event was passed.
    			  if (task.event === event) {
    				self._queue.shift();
    				self._loadQueue();
    			  }
    	  
    			  // Run the task if no event type is passed.
    			  if (!event) {
    				task.action();
    			  }
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Fired when playback ends at the end of the duration.
    		   * @param  {Sound} sound The sound object to work with.
    		   * @return {Howl}
    		   */
    		  _ended: function(sound) {
    			var self = this;
    			var sprite = sound._sprite;
    	  
    			// If we are using IE and there was network latency we may be clipping
    			// audio before it completes playing. Lets check the node to make sure it
    			// believes it has completed, before ending the playback.
    			if (!self._webAudio && sound._node && !sound._node.paused && !sound._node.ended && sound._node.currentTime < sound._stop) {
    			  setTimeout(self._ended.bind(self, sound), 100);
    			  return self;
    			}
    	  
    			// Should this sound loop?
    			var loop = !!(sound._loop || self._sprite[sprite][2]);
    	  
    			// Fire the ended event.
    			self._emit('end', sound._id);
    	  
    			// Restart the playback for HTML5 Audio loop.
    			if (!self._webAudio && loop) {
    			  self.stop(sound._id, true).play(sound._id);
    			}
    	  
    			// Restart this timer if on a Web Audio loop.
    			if (self._webAudio && loop) {
    			  self._emit('play', sound._id);
    			  sound._seek = sound._start || 0;
    			  sound._rateSeek = 0;
    			  sound._playStart = Howler.ctx.currentTime;
    	  
    			  var timeout = ((sound._stop - sound._start) * 1000) / Math.abs(sound._rate);
    			  self._endTimers[sound._id] = setTimeout(self._ended.bind(self, sound), timeout);
    			}
    	  
    			// Mark the node as paused.
    			if (self._webAudio && !loop) {
    			  sound._paused = true;
    			  sound._ended = true;
    			  sound._seek = sound._start || 0;
    			  sound._rateSeek = 0;
    			  self._clearTimer(sound._id);
    	  
    			  // Clean up the buffer source.
    			  self._cleanBuffer(sound._node);
    	  
    			  // Attempt to auto-suspend AudioContext if no sounds are still playing.
    			  Howler._autoSuspend();
    			}
    	  
    			// When using a sprite, end the track.
    			if (!self._webAudio && !loop) {
    			  self.stop(sound._id, true);
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Clear the end timer for a sound playback.
    		   * @param  {Number} id The sound ID.
    		   * @return {Howl}
    		   */
    		  _clearTimer: function(id) {
    			var self = this;
    	  
    			if (self._endTimers[id]) {
    			  // Clear the timeout or remove the ended listener.
    			  if (typeof self._endTimers[id] !== 'function') {
    				clearTimeout(self._endTimers[id]);
    			  } else {
    				var sound = self._soundById(id);
    				if (sound && sound._node) {
    				  sound._node.removeEventListener('ended', self._endTimers[id], false);
    				}
    			  }
    	  
    			  delete self._endTimers[id];
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Return the sound identified by this ID, or return null.
    		   * @param  {Number} id Sound ID
    		   * @return {Object}    Sound object or null.
    		   */
    		  _soundById: function(id) {
    			var self = this;
    	  
    			// Loop through all sounds and find the one with this ID.
    			for (var i=0; i<self._sounds.length; i++) {
    			  if (id === self._sounds[i]._id) {
    				return self._sounds[i];
    			  }
    			}
    	  
    			return null;
    		  },
    	  
    		  /**
    		   * Return an inactive sound from the pool or create a new one.
    		   * @return {Sound} Sound playback object.
    		   */
    		  _inactiveSound: function() {
    			var self = this;
    	  
    			self._drain();
    	  
    			// Find the first inactive node to recycle.
    			for (var i=0; i<self._sounds.length; i++) {
    			  if (self._sounds[i]._ended) {
    				return self._sounds[i].reset();
    			  }
    			}
    	  
    			// If no inactive node was found, create a new one.
    			return new Sound(self);
    		  },
    	  
    		  /**
    		   * Drain excess inactive sounds from the pool.
    		   */
    		  _drain: function() {
    			var self = this;
    			var limit = self._pool;
    			var cnt = 0;
    			var i = 0;
    	  
    			// If there are less sounds than the max pool size, we are done.
    			if (self._sounds.length < limit) {
    			  return;
    			}
    	  
    			// Count the number of inactive sounds.
    			for (i=0; i<self._sounds.length; i++) {
    			  if (self._sounds[i]._ended) {
    				cnt++;
    			  }
    			}
    	  
    			// Remove excess inactive sounds, going in reverse order.
    			for (i=self._sounds.length - 1; i>=0; i--) {
    			  if (cnt <= limit) {
    				return;
    			  }
    	  
    			  if (self._sounds[i]._ended) {
    				// Disconnect the audio source when using Web Audio.
    				if (self._webAudio && self._sounds[i]._node) {
    				  self._sounds[i]._node.disconnect(0);
    				}
    	  
    				// Remove sounds until we have the pool size.
    				self._sounds.splice(i, 1);
    				cnt--;
    			  }
    			}
    		  },
    	  
    		  /**
    		   * Get all ID's from the sounds pool.
    		   * @param  {Number} id Only return one ID if one is passed.
    		   * @return {Array}    Array of IDs.
    		   */
    		  _getSoundIds: function(id) {
    			var self = this;
    	  
    			if (typeof id === 'undefined') {
    			  var ids = [];
    			  for (var i=0; i<self._sounds.length; i++) {
    				ids.push(self._sounds[i]._id);
    			  }
    	  
    			  return ids;
    			} else {
    			  return [id];
    			}
    		  },
    	  
    		  /**
    		   * Load the sound back into the buffer source.
    		   * @param  {Sound} sound The sound object to work with.
    		   * @return {Howl}
    		   */
    		  _refreshBuffer: function(sound) {
    			var self = this;
    	  
    			// Setup the buffer source for playback.
    			sound._node.bufferSource = Howler.ctx.createBufferSource();
    			sound._node.bufferSource.buffer = cache[self._src];
    	  
    			// Connect to the correct node.
    			if (sound._panner) {
    			  sound._node.bufferSource.connect(sound._panner);
    			} else {
    			  sound._node.bufferSource.connect(sound._node);
    			}
    	  
    			// Setup looping and playback rate.
    			sound._node.bufferSource.loop = sound._loop;
    			if (sound._loop) {
    			  sound._node.bufferSource.loopStart = sound._start || 0;
    			  sound._node.bufferSource.loopEnd = sound._stop || 0;
    			}
    			sound._node.bufferSource.playbackRate.setValueAtTime(sound._rate, Howler.ctx.currentTime);
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Prevent memory leaks by cleaning up the buffer source after playback.
    		   * @param  {Object} node Sound's audio node containing the buffer source.
    		   * @return {Howl}
    		   */
    		  _cleanBuffer: function(node) {
    			var self = this;
    			var isIOS = Howler._navigator && Howler._navigator.vendor.indexOf('Apple') >= 0;
    	  
    			if (Howler._scratchBuffer && node.bufferSource) {
    			  node.bufferSource.onended = null;
    			  node.bufferSource.disconnect(0);
    			  if (isIOS) {
    				try { node.bufferSource.buffer = Howler._scratchBuffer; } catch(e) {}
    			  }
    			}
    			node.bufferSource = null;
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Set the source to a 0-second silence to stop any downloading (except in IE).
    		   * @param  {Object} node Audio node to clear.
    		   */
    		  _clearSound: function(node) {
    			var checkIE = /MSIE |Trident\//.test(Howler._navigator && Howler._navigator.userAgent);
    			if (!checkIE) {
    			  node.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    			}
    		  }
    		};
    	  
    		/** Single Sound Methods **/
    		/***************************************************************************/
    	  
    		/**
    		 * Setup the sound object, which each node attached to a Howl group is contained in.
    		 * @param {Object} howl The Howl parent group.
    		 */
    		var Sound = function(howl) {
    		  this._parent = howl;
    		  this.init();
    		};
    		Sound.prototype = {
    		  /**
    		   * Initialize a new Sound object.
    		   * @return {Sound}
    		   */
    		  init: function() {
    			var self = this;
    			var parent = self._parent;
    	  
    			// Setup the default parameters.
    			self._muted = parent._muted;
    			self._loop = parent._loop;
    			self._volume = parent._volume;
    			self._rate = parent._rate;
    			self._seek = 0;
    			self._paused = true;
    			self._ended = true;
    			self._sprite = '__default';
    	  
    			// Generate a unique ID for this sound.
    			self._id = ++Howler._counter;
    	  
    			// Add itself to the parent's pool.
    			parent._sounds.push(self);
    	  
    			// Create the new node.
    			self.create();
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Create and setup a new sound object, whether HTML5 Audio or Web Audio.
    		   * @return {Sound}
    		   */
    		  create: function() {
    			var self = this;
    			var parent = self._parent;
    			var volume = (Howler._muted || self._muted || self._parent._muted) ? 0 : self._volume;
    	  
    			if (parent._webAudio) {
    			  // Create the gain node for controlling volume (the source will connect to this).
    			  self._node = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
    			  self._node.gain.setValueAtTime(volume, Howler.ctx.currentTime);
    			  self._node.paused = true;
    			  self._node.connect(Howler.masterGain);
    			} else if (!Howler.noAudio) {
    			  // Get an unlocked Audio object from the pool.
    			  self._node = Howler._obtainHtml5Audio();
    	  
    			  // Listen for errors (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror).
    			  self._errorFn = self._errorListener.bind(self);
    			  self._node.addEventListener('error', self._errorFn, false);
    	  
    			  // Listen for 'canplaythrough' event to let us know the sound is ready.
    			  self._loadFn = self._loadListener.bind(self);
    			  self._node.addEventListener(Howler._canPlayEvent, self._loadFn, false);
    	  
    			  // Listen for the 'ended' event on the sound to account for edge-case where
    			  // a finite sound has a duration of Infinity.
    			  self._endFn = self._endListener.bind(self);
    			  self._node.addEventListener('ended', self._endFn, false);
    	  
    			  // Setup the new audio node.
    			  self._node.src = parent._src;
    			  self._node.preload = parent._preload === true ? 'auto' : parent._preload;
    			  self._node.volume = volume * Howler.volume();
    	  
    			  // Begin loading the source.
    			  self._node.load();
    			}
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * Reset the parameters of this sound to the original state (for recycle).
    		   * @return {Sound}
    		   */
    		  reset: function() {
    			var self = this;
    			var parent = self._parent;
    	  
    			// Reset all of the parameters of this sound.
    			self._muted = parent._muted;
    			self._loop = parent._loop;
    			self._volume = parent._volume;
    			self._rate = parent._rate;
    			self._seek = 0;
    			self._rateSeek = 0;
    			self._paused = true;
    			self._ended = true;
    			self._sprite = '__default';
    	  
    			// Generate a new ID so that it isn't confused with the previous sound.
    			self._id = ++Howler._counter;
    	  
    			return self;
    		  },
    	  
    		  /**
    		   * HTML5 Audio error listener callback.
    		   */
    		  _errorListener: function() {
    			var self = this;
    	  
    			// Fire an error event and pass back the code.
    			self._parent._emit('loaderror', self._id, self._node.error ? self._node.error.code : 0);
    	  
    			// Clear the event listener.
    			self._node.removeEventListener('error', self._errorFn, false);
    		  },
    	  
    		  /**
    		   * HTML5 Audio canplaythrough listener callback.
    		   */
    		  _loadListener: function() {
    			var self = this;
    			var parent = self._parent;
    	  
    			// Round up the duration to account for the lower precision in HTML5 Audio.
    			parent._duration = Math.ceil(self._node.duration * 10) / 10;
    	  
    			// Setup a sprite if none is defined.
    			if (Object.keys(parent._sprite).length === 0) {
    			  parent._sprite = {__default: [0, parent._duration * 1000]};
    			}
    	  
    			if (parent._state !== 'loaded') {
    			  parent._state = 'loaded';
    			  parent._emit('load');
    			  parent._loadQueue();
    			}
    	  
    			// Clear the event listener.
    			self._node.removeEventListener(Howler._canPlayEvent, self._loadFn, false);
    		  },
    	  
    		  /**
    		   * HTML5 Audio ended listener callback.
    		   */
    		  _endListener: function() {
    			var self = this;
    			var parent = self._parent;
    	  
    			// Only handle the `ended`` event if the duration is Infinity.
    			if (parent._duration === Infinity) {
    			  // Update the parent duration to match the real audio duration.
    			  // Round up the duration to account for the lower precision in HTML5 Audio.
    			  parent._duration = Math.ceil(self._node.duration * 10) / 10;
    	  
    			  // Update the sprite that corresponds to the real duration.
    			  if (parent._sprite.__default[1] === Infinity) {
    				parent._sprite.__default[1] = parent._duration * 1000;
    			  }
    	  
    			  // Run the regular ended method.
    			  parent._ended(self);
    			}
    	  
    			// Clear the event listener since the duration is now correct.
    			self._node.removeEventListener('ended', self._endFn, false);
    		  }
    		};
    	  
    		/** Helper Methods **/
    		/***************************************************************************/
    	  
    		var cache = {};
    	  
    		/**
    		 * Buffer a sound from URL, Data URI or cache and decode to audio source (Web Audio API).
    		 * @param  {Howl} self
    		 */
    		var loadBuffer = function(self) {
    		  var url = self._src;
    	  
    		  // Check if the buffer has already been cached and use it instead.
    		  if (cache[url]) {
    			// Set the duration from the cache.
    			self._duration = cache[url].duration;
    	  
    			// Load the sound into this Howl.
    			loadSound(self);
    	  
    			return;
    		  }
    	  
    		  if (/^data:[^;]+;base64,/.test(url)) {
    			// Decode the base64 data URI without XHR, since some browsers don't support it.
    			var data = atob(url.split(',')[1]);
    			var dataView = new Uint8Array(data.length);
    			for (var i=0; i<data.length; ++i) {
    			  dataView[i] = data.charCodeAt(i);
    			}
    	  
    			decodeAudioData(dataView.buffer, self);
    		  } else {
    			// Load the buffer from the URL.
    			var xhr = new XMLHttpRequest();
    			xhr.open(self._xhr.method, url, true);
    			xhr.withCredentials = self._xhr.withCredentials;
    			xhr.responseType = 'arraybuffer';
    	  
    			// Apply any custom headers to the request.
    			if (self._xhr.headers) {
    			  Object.keys(self._xhr.headers).forEach(function(key) {
    				xhr.setRequestHeader(key, self._xhr.headers[key]);
    			  });
    			}
    	  
    			xhr.onload = function() {
    			  // Make sure we get a successful response back.
    			  var code = (xhr.status + '')[0];
    			  if (code !== '0' && code !== '2' && code !== '3') {
    				self._emit('loaderror', null, 'Failed loading audio file with status: ' + xhr.status + '.');
    				return;
    			  }
    	  
    			  decodeAudioData(xhr.response, self);
    			};
    			xhr.onerror = function() {
    			  // If there is an error, switch to HTML5 Audio.
    			  if (self._webAudio) {
    				self._html5 = true;
    				self._webAudio = false;
    				self._sounds = [];
    				delete cache[url];
    				self.load();
    			  }
    			};
    			safeXhrSend(xhr);
    		  }
    		};
    	  
    		/**
    		 * Send the XHR request wrapped in a try/catch.
    		 * @param  {Object} xhr XHR to send.
    		 */
    		var safeXhrSend = function(xhr) {
    		  try {
    			xhr.send();
    		  } catch (e) {
    			xhr.onerror();
    		  }
    		};
    	  
    		/**
    		 * Decode audio data from an array buffer.
    		 * @param  {ArrayBuffer} arraybuffer The audio data.
    		 * @param  {Howl}        self
    		 */
    		var decodeAudioData = function(arraybuffer, self) {
    		  // Fire a load error if something broke.
    		  var error = function() {
    			self._emit('loaderror', null, 'Decoding audio data failed.');
    		  };
    	  
    		  // Load the sound on success.
    		  var success = function(buffer) {
    			if (buffer && self._sounds.length > 0) {
    			  cache[self._src] = buffer;
    			  loadSound(self, buffer);
    			} else {
    			  error();
    			}
    		  };
    	  
    		  // Decode the buffer into an audio source.
    		  if (typeof Promise !== 'undefined' && Howler.ctx.decodeAudioData.length === 1) {
    			Howler.ctx.decodeAudioData(arraybuffer).then(success).catch(error);
    		  } else {
    			Howler.ctx.decodeAudioData(arraybuffer, success, error);
    		  }
    		};
    	  
    		/**
    		 * Sound is now loaded, so finish setting everything up and fire the loaded event.
    		 * @param  {Howl} self
    		 * @param  {Object} buffer The decoded buffer sound source.
    		 */
    		var loadSound = function(self, buffer) {
    		  // Set the duration.
    		  if (buffer && !self._duration) {
    			self._duration = buffer.duration;
    		  }
    	  
    		  // Setup a sprite if none is defined.
    		  if (Object.keys(self._sprite).length === 0) {
    			self._sprite = {__default: [0, self._duration * 1000]};
    		  }
    	  
    		  // Fire the loaded event.
    		  if (self._state !== 'loaded') {
    			self._state = 'loaded';
    			self._emit('load');
    			self._loadQueue();
    		  }
    		};
    	  
    		/**
    		 * Setup the audio context when available, or switch to HTML5 Audio mode.
    		 */
    		var setupAudioContext = function() {
    		  // If we have already detected that Web Audio isn't supported, don't run this step again.
    		  if (!Howler.usingWebAudio) {
    			return;
    		  }
    	  
    		  // Check if we are using Web Audio and setup the AudioContext if we are.
    		  try {
    			if (typeof AudioContext !== 'undefined') {
    			  Howler.ctx = new AudioContext();
    			} else if (typeof webkitAudioContext !== 'undefined') {
    			  Howler.ctx = new webkitAudioContext();
    			} else {
    			  Howler.usingWebAudio = false;
    			}
    		  } catch(e) {
    			Howler.usingWebAudio = false;
    		  }
    	  
    		  // If the audio context creation still failed, set using web audio to false.
    		  if (!Howler.ctx) {
    			Howler.usingWebAudio = false;
    		  }
    	  
    		  // Check if a webview is being used on iOS8 or earlier (rather than the browser).
    		  // If it is, disable Web Audio as it causes crashing.
    		  var iOS = (/iP(hone|od|ad)/.test(Howler._navigator && Howler._navigator.platform));
    		  var appVersion = Howler._navigator && Howler._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/);
    		  var version = appVersion ? parseInt(appVersion[1], 10) : null;
    		  if (iOS && version && version < 9) {
    			var safari = /safari/.test(Howler._navigator && Howler._navigator.userAgent.toLowerCase());
    			if (Howler._navigator && !safari) {
    			  Howler.usingWebAudio = false;
    			}
    		  }
    	  
    		  // Create and expose the master GainNode when using Web Audio (useful for plugins or advanced usage).
    		  if (Howler.usingWebAudio) {
    			Howler.masterGain = (typeof Howler.ctx.createGain === 'undefined') ? Howler.ctx.createGainNode() : Howler.ctx.createGain();
    			Howler.masterGain.gain.setValueAtTime(Howler._muted ? 0 : Howler._volume, Howler.ctx.currentTime);
    			Howler.masterGain.connect(Howler.ctx.destination);
    		  }
    	  
    		  // Re-run the setup on Howler.
    		  Howler._setup();
    		};
    	  
    		// Add support for CommonJS libraries such as browserify.
    		{
    		  exports.Howler = Howler;
    		  exports.Howl = Howl;
    		}
    	  
    		// Add to global in Node.js (for testing, etc).
    		if (typeof commonjsGlobal !== 'undefined') {
    		  commonjsGlobal.HowlerGlobal = HowlerGlobal;
    		  commonjsGlobal.Howler = Howler;
    		  commonjsGlobal.Howl = Howl;
    		  commonjsGlobal.Sound = Sound;
    		} else if (typeof window !== 'undefined') {  // Define globally in case AMD is not available or unused.
    		  window.HowlerGlobal = HowlerGlobal;
    		  window.Howler = Howler;
    		  window.Howl = Howl;
    		  window.Sound = Sound;
    		}
    	  })();
    	  
    	  
    	  /*!
    	   *  Spatial Plugin - Adds support for stereo and 3D audio where Web Audio is supported.
    	   *  
    	   *  howler.js v2.2.3
    	   *  howlerjs.com
    	   *
    	   *  (c) 2013-2020, James Simpson of GoldFire Studios
    	   *  goldfirestudios.com
    	   *
    	   *  MIT License
    	   */
    	  
    	  (function() {
    	  
    		// Setup default properties.
    		HowlerGlobal.prototype._pos = [0, 0, 0];
    		HowlerGlobal.prototype._orientation = [0, 0, -1, 0, 1, 0];
    	  
    		/** Global Methods **/
    		/***************************************************************************/
    	  
    		/**
    		 * Helper method to update the stereo panning position of all current Howls.
    		 * Future Howls will not use this value unless explicitly set.
    		 * @param  {Number} pan A value of -1.0 is all the way left and 1.0 is all the way right.
    		 * @return {Howler/Number}     Self or current stereo panning value.
    		 */
    		HowlerGlobal.prototype.stereo = function(pan) {
    		  var self = this;
    	  
    		  // Stop right here if not using Web Audio.
    		  if (!self.ctx || !self.ctx.listener) {
    			return self;
    		  }
    	  
    		  // Loop through all Howls and update their stereo panning.
    		  for (var i=self._howls.length-1; i>=0; i--) {
    			self._howls[i].stereo(pan);
    		  }
    	  
    		  return self;
    		};
    	  
    		/**
    		 * Get/set the position of the listener in 3D cartesian space. Sounds using
    		 * 3D position will be relative to the listener's position.
    		 * @param  {Number} x The x-position of the listener.
    		 * @param  {Number} y The y-position of the listener.
    		 * @param  {Number} z The z-position of the listener.
    		 * @return {Howler/Array}   Self or current listener position.
    		 */
    		HowlerGlobal.prototype.pos = function(x, y, z) {
    		  var self = this;
    	  
    		  // Stop right here if not using Web Audio.
    		  if (!self.ctx || !self.ctx.listener) {
    			return self;
    		  }
    	  
    		  // Set the defaults for optional 'y' & 'z'.
    		  y = (typeof y !== 'number') ? self._pos[1] : y;
    		  z = (typeof z !== 'number') ? self._pos[2] : z;
    	  
    		  if (typeof x === 'number') {
    			self._pos = [x, y, z];
    	  
    			if (typeof self.ctx.listener.positionX !== 'undefined') {
    			  self.ctx.listener.positionX.setTargetAtTime(self._pos[0], Howler.ctx.currentTime, 0.1);
    			  self.ctx.listener.positionY.setTargetAtTime(self._pos[1], Howler.ctx.currentTime, 0.1);
    			  self.ctx.listener.positionZ.setTargetAtTime(self._pos[2], Howler.ctx.currentTime, 0.1);
    			} else {
    			  self.ctx.listener.setPosition(self._pos[0], self._pos[1], self._pos[2]);
    			}
    		  } else {
    			return self._pos;
    		  }
    	  
    		  return self;
    		};
    	  
    		/**
    		 * Get/set the direction the listener is pointing in the 3D cartesian space.
    		 * A front and up vector must be provided. The front is the direction the
    		 * face of the listener is pointing, and up is the direction the top of the
    		 * listener is pointing. Thus, these values are expected to be at right angles
    		 * from each other.
    		 * @param  {Number} x   The x-orientation of the listener.
    		 * @param  {Number} y   The y-orientation of the listener.
    		 * @param  {Number} z   The z-orientation of the listener.
    		 * @param  {Number} xUp The x-orientation of the top of the listener.
    		 * @param  {Number} yUp The y-orientation of the top of the listener.
    		 * @param  {Number} zUp The z-orientation of the top of the listener.
    		 * @return {Howler/Array}     Returns self or the current orientation vectors.
    		 */
    		HowlerGlobal.prototype.orientation = function(x, y, z, xUp, yUp, zUp) {
    		  var self = this;
    	  
    		  // Stop right here if not using Web Audio.
    		  if (!self.ctx || !self.ctx.listener) {
    			return self;
    		  }
    	  
    		  // Set the defaults for optional 'y' & 'z'.
    		  var or = self._orientation;
    		  y = (typeof y !== 'number') ? or[1] : y;
    		  z = (typeof z !== 'number') ? or[2] : z;
    		  xUp = (typeof xUp !== 'number') ? or[3] : xUp;
    		  yUp = (typeof yUp !== 'number') ? or[4] : yUp;
    		  zUp = (typeof zUp !== 'number') ? or[5] : zUp;
    	  
    		  if (typeof x === 'number') {
    			self._orientation = [x, y, z, xUp, yUp, zUp];
    	  
    			if (typeof self.ctx.listener.forwardX !== 'undefined') {
    			  self.ctx.listener.forwardX.setTargetAtTime(x, Howler.ctx.currentTime, 0.1);
    			  self.ctx.listener.forwardY.setTargetAtTime(y, Howler.ctx.currentTime, 0.1);
    			  self.ctx.listener.forwardZ.setTargetAtTime(z, Howler.ctx.currentTime, 0.1);
    			  self.ctx.listener.upX.setTargetAtTime(xUp, Howler.ctx.currentTime, 0.1);
    			  self.ctx.listener.upY.setTargetAtTime(yUp, Howler.ctx.currentTime, 0.1);
    			  self.ctx.listener.upZ.setTargetAtTime(zUp, Howler.ctx.currentTime, 0.1);
    			} else {
    			  self.ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
    			}
    		  } else {
    			return or;
    		  }
    	  
    		  return self;
    		};
    	  
    		/** Group Methods **/
    		/***************************************************************************/
    	  
    		/**
    		 * Add new properties to the core init.
    		 * @param  {Function} _super Core init method.
    		 * @return {Howl}
    		 */
    		Howl.prototype.init = (function(_super) {
    		  return function(o) {
    			var self = this;
    	  
    			// Setup user-defined default properties.
    			self._orientation = o.orientation || [1, 0, 0];
    			self._stereo = o.stereo || null;
    			self._pos = o.pos || null;
    			self._pannerAttr = {
    			  coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : 360,
    			  coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : 360,
    			  coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : 0,
    			  distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : 'inverse',
    			  maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : 10000,
    			  panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : 'HRTF',
    			  refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : 1,
    			  rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : 1
    			};
    	  
    			// Setup event listeners.
    			self._onstereo = o.onstereo ? [{fn: o.onstereo}] : [];
    			self._onpos = o.onpos ? [{fn: o.onpos}] : [];
    			self._onorientation = o.onorientation ? [{fn: o.onorientation}] : [];
    	  
    			// Complete initilization with howler.js core's init function.
    			return _super.call(this, o);
    		  };
    		})(Howl.prototype.init);
    	  
    		/**
    		 * Get/set the stereo panning of the audio source for this sound or all in the group.
    		 * @param  {Number} pan  A value of -1.0 is all the way left and 1.0 is all the way right.
    		 * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
    		 * @return {Howl/Number}    Returns self or the current stereo panning value.
    		 */
    		Howl.prototype.stereo = function(pan, id) {
    		  var self = this;
    	  
    		  // Stop right here if not using Web Audio.
    		  if (!self._webAudio) {
    			return self;
    		  }
    	  
    		  // If the sound hasn't loaded, add it to the load queue to change stereo pan when capable.
    		  if (self._state !== 'loaded') {
    			self._queue.push({
    			  event: 'stereo',
    			  action: function() {
    				self.stereo(pan, id);
    			  }
    			});
    	  
    			return self;
    		  }
    	  
    		  // Check for PannerStereoNode support and fallback to PannerNode if it doesn't exist.
    		  var pannerType = (typeof Howler.ctx.createStereoPanner === 'undefined') ? 'spatial' : 'stereo';
    	  
    		  // Setup the group's stereo panning if no ID is passed.
    		  if (typeof id === 'undefined') {
    			// Return the group's stereo panning if no parameters are passed.
    			if (typeof pan === 'number') {
    			  self._stereo = pan;
    			  self._pos = [pan, 0, 0];
    			} else {
    			  return self._stereo;
    			}
    		  }
    	  
    		  // Change the streo panning of one or all sounds in group.
    		  var ids = self._getSoundIds(id);
    		  for (var i=0; i<ids.length; i++) {
    			// Get the sound.
    			var sound = self._soundById(ids[i]);
    	  
    			if (sound) {
    			  if (typeof pan === 'number') {
    				sound._stereo = pan;
    				sound._pos = [pan, 0, 0];
    	  
    				if (sound._node) {
    				  // If we are falling back, make sure the panningModel is equalpower.
    				  sound._pannerAttr.panningModel = 'equalpower';
    	  
    				  // Check if there is a panner setup and create a new one if not.
    				  if (!sound._panner || !sound._panner.pan) {
    					setupPanner(sound, pannerType);
    				  }
    	  
    				  if (pannerType === 'spatial') {
    					if (typeof sound._panner.positionX !== 'undefined') {
    					  sound._panner.positionX.setValueAtTime(pan, Howler.ctx.currentTime);
    					  sound._panner.positionY.setValueAtTime(0, Howler.ctx.currentTime);
    					  sound._panner.positionZ.setValueAtTime(0, Howler.ctx.currentTime);
    					} else {
    					  sound._panner.setPosition(pan, 0, 0);
    					}
    				  } else {
    					sound._panner.pan.setValueAtTime(pan, Howler.ctx.currentTime);
    				  }
    				}
    	  
    				self._emit('stereo', sound._id);
    			  } else {
    				return sound._stereo;
    			  }
    			}
    		  }
    	  
    		  return self;
    		};
    	  
    		/**
    		 * Get/set the 3D spatial position of the audio source for this sound or group relative to the global listener.
    		 * @param  {Number} x  The x-position of the audio source.
    		 * @param  {Number} y  The y-position of the audio source.
    		 * @param  {Number} z  The z-position of the audio source.
    		 * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
    		 * @return {Howl/Array}    Returns self or the current 3D spatial position: [x, y, z].
    		 */
    		Howl.prototype.pos = function(x, y, z, id) {
    		  var self = this;
    	  
    		  // Stop right here if not using Web Audio.
    		  if (!self._webAudio) {
    			return self;
    		  }
    	  
    		  // If the sound hasn't loaded, add it to the load queue to change position when capable.
    		  if (self._state !== 'loaded') {
    			self._queue.push({
    			  event: 'pos',
    			  action: function() {
    				self.pos(x, y, z, id);
    			  }
    			});
    	  
    			return self;
    		  }
    	  
    		  // Set the defaults for optional 'y' & 'z'.
    		  y = (typeof y !== 'number') ? 0 : y;
    		  z = (typeof z !== 'number') ? -0.5 : z;
    	  
    		  // Setup the group's spatial position if no ID is passed.
    		  if (typeof id === 'undefined') {
    			// Return the group's spatial position if no parameters are passed.
    			if (typeof x === 'number') {
    			  self._pos = [x, y, z];
    			} else {
    			  return self._pos;
    			}
    		  }
    	  
    		  // Change the spatial position of one or all sounds in group.
    		  var ids = self._getSoundIds(id);
    		  for (var i=0; i<ids.length; i++) {
    			// Get the sound.
    			var sound = self._soundById(ids[i]);
    	  
    			if (sound) {
    			  if (typeof x === 'number') {
    				sound._pos = [x, y, z];
    	  
    				if (sound._node) {
    				  // Check if there is a panner setup and create a new one if not.
    				  if (!sound._panner || sound._panner.pan) {
    					setupPanner(sound, 'spatial');
    				  }
    	  
    				  if (typeof sound._panner.positionX !== 'undefined') {
    					sound._panner.positionX.setValueAtTime(x, Howler.ctx.currentTime);
    					sound._panner.positionY.setValueAtTime(y, Howler.ctx.currentTime);
    					sound._panner.positionZ.setValueAtTime(z, Howler.ctx.currentTime);
    				  } else {
    					sound._panner.setPosition(x, y, z);
    				  }
    				}
    	  
    				self._emit('pos', sound._id);
    			  } else {
    				return sound._pos;
    			  }
    			}
    		  }
    	  
    		  return self;
    		};
    	  
    		/**
    		 * Get/set the direction the audio source is pointing in the 3D cartesian coordinate
    		 * space. Depending on how direction the sound is, based on the `cone` attributes,
    		 * a sound pointing away from the listener can be quiet or silent.
    		 * @param  {Number} x  The x-orientation of the source.
    		 * @param  {Number} y  The y-orientation of the source.
    		 * @param  {Number} z  The z-orientation of the source.
    		 * @param  {Number} id (optional) The sound ID. If none is passed, all in group will be updated.
    		 * @return {Howl/Array}    Returns self or the current 3D spatial orientation: [x, y, z].
    		 */
    		Howl.prototype.orientation = function(x, y, z, id) {
    		  var self = this;
    	  
    		  // Stop right here if not using Web Audio.
    		  if (!self._webAudio) {
    			return self;
    		  }
    	  
    		  // If the sound hasn't loaded, add it to the load queue to change orientation when capable.
    		  if (self._state !== 'loaded') {
    			self._queue.push({
    			  event: 'orientation',
    			  action: function() {
    				self.orientation(x, y, z, id);
    			  }
    			});
    	  
    			return self;
    		  }
    	  
    		  // Set the defaults for optional 'y' & 'z'.
    		  y = (typeof y !== 'number') ? self._orientation[1] : y;
    		  z = (typeof z !== 'number') ? self._orientation[2] : z;
    	  
    		  // Setup the group's spatial orientation if no ID is passed.
    		  if (typeof id === 'undefined') {
    			// Return the group's spatial orientation if no parameters are passed.
    			if (typeof x === 'number') {
    			  self._orientation = [x, y, z];
    			} else {
    			  return self._orientation;
    			}
    		  }
    	  
    		  // Change the spatial orientation of one or all sounds in group.
    		  var ids = self._getSoundIds(id);
    		  for (var i=0; i<ids.length; i++) {
    			// Get the sound.
    			var sound = self._soundById(ids[i]);
    	  
    			if (sound) {
    			  if (typeof x === 'number') {
    				sound._orientation = [x, y, z];
    	  
    				if (sound._node) {
    				  // Check if there is a panner setup and create a new one if not.
    				  if (!sound._panner) {
    					// Make sure we have a position to setup the node with.
    					if (!sound._pos) {
    					  sound._pos = self._pos || [0, 0, -0.5];
    					}
    	  
    					setupPanner(sound, 'spatial');
    				  }
    	  
    				  if (typeof sound._panner.orientationX !== 'undefined') {
    					sound._panner.orientationX.setValueAtTime(x, Howler.ctx.currentTime);
    					sound._panner.orientationY.setValueAtTime(y, Howler.ctx.currentTime);
    					sound._panner.orientationZ.setValueAtTime(z, Howler.ctx.currentTime);
    				  } else {
    					sound._panner.setOrientation(x, y, z);
    				  }
    				}
    	  
    				self._emit('orientation', sound._id);
    			  } else {
    				return sound._orientation;
    			  }
    			}
    		  }
    	  
    		  return self;
    		};
    	  
    		/**
    		 * Get/set the panner node's attributes for a sound or group of sounds.
    		 * This method can optionall take 0, 1 or 2 arguments.
    		 *   pannerAttr() -> Returns the group's values.
    		 *   pannerAttr(id) -> Returns the sound id's values.
    		 *   pannerAttr(o) -> Set's the values of all sounds in this Howl group.
    		 *   pannerAttr(o, id) -> Set's the values of passed sound id.
    		 *
    		 *   Attributes:
    		 *     coneInnerAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
    		 *                      inside of which there will be no volume reduction.
    		 *     coneOuterAngle - (360 by default) A parameter for directional audio sources, this is an angle, in degrees,
    		 *                      outside of which the volume will be reduced to a constant value of `coneOuterGain`.
    		 *     coneOuterGain - (0 by default) A parameter for directional audio sources, this is the gain outside of the
    		 *                     `coneOuterAngle`. It is a linear value in the range `[0, 1]`.
    		 *     distanceModel - ('inverse' by default) Determines algorithm used to reduce volume as audio moves away from
    		 *                     listener. Can be `linear`, `inverse` or `exponential.
    		 *     maxDistance - (10000 by default) The maximum distance between source and listener, after which the volume
    		 *                   will not be reduced any further.
    		 *     refDistance - (1 by default) A reference distance for reducing volume as source moves further from the listener.
    		 *                   This is simply a variable of the distance model and has a different effect depending on which model
    		 *                   is used and the scale of your coordinates. Generally, volume will be equal to 1 at this distance.
    		 *     rolloffFactor - (1 by default) How quickly the volume reduces as source moves from listener. This is simply a
    		 *                     variable of the distance model and can be in the range of `[0, 1]` with `linear` and `[0, ∞]`
    		 *                     with `inverse` and `exponential`.
    		 *     panningModel - ('HRTF' by default) Determines which spatialization algorithm is used to position audio.
    		 *                     Can be `HRTF` or `equalpower`.
    		 *
    		 * @return {Howl/Object} Returns self or current panner attributes.
    		 */
    		Howl.prototype.pannerAttr = function() {
    		  var self = this;
    		  var args = arguments;
    		  var o, id, sound;
    	  
    		  // Stop right here if not using Web Audio.
    		  if (!self._webAudio) {
    			return self;
    		  }
    	  
    		  // Determine the values based on arguments.
    		  if (args.length === 0) {
    			// Return the group's panner attribute values.
    			return self._pannerAttr;
    		  } else if (args.length === 1) {
    			if (typeof args[0] === 'object') {
    			  o = args[0];
    	  
    			  // Set the grou's panner attribute values.
    			  if (typeof id === 'undefined') {
    				if (!o.pannerAttr) {
    				  o.pannerAttr = {
    					coneInnerAngle: o.coneInnerAngle,
    					coneOuterAngle: o.coneOuterAngle,
    					coneOuterGain: o.coneOuterGain,
    					distanceModel: o.distanceModel,
    					maxDistance: o.maxDistance,
    					refDistance: o.refDistance,
    					rolloffFactor: o.rolloffFactor,
    					panningModel: o.panningModel
    				  };
    				}
    	  
    				self._pannerAttr = {
    				  coneInnerAngle: typeof o.pannerAttr.coneInnerAngle !== 'undefined' ? o.pannerAttr.coneInnerAngle : self._coneInnerAngle,
    				  coneOuterAngle: typeof o.pannerAttr.coneOuterAngle !== 'undefined' ? o.pannerAttr.coneOuterAngle : self._coneOuterAngle,
    				  coneOuterGain: typeof o.pannerAttr.coneOuterGain !== 'undefined' ? o.pannerAttr.coneOuterGain : self._coneOuterGain,
    				  distanceModel: typeof o.pannerAttr.distanceModel !== 'undefined' ? o.pannerAttr.distanceModel : self._distanceModel,
    				  maxDistance: typeof o.pannerAttr.maxDistance !== 'undefined' ? o.pannerAttr.maxDistance : self._maxDistance,
    				  refDistance: typeof o.pannerAttr.refDistance !== 'undefined' ? o.pannerAttr.refDistance : self._refDistance,
    				  rolloffFactor: typeof o.pannerAttr.rolloffFactor !== 'undefined' ? o.pannerAttr.rolloffFactor : self._rolloffFactor,
    				  panningModel: typeof o.pannerAttr.panningModel !== 'undefined' ? o.pannerAttr.panningModel : self._panningModel
    				};
    			  }
    			} else {
    			  // Return this sound's panner attribute values.
    			  sound = self._soundById(parseInt(args[0], 10));
    			  return sound ? sound._pannerAttr : self._pannerAttr;
    			}
    		  } else if (args.length === 2) {
    			o = args[0];
    			id = parseInt(args[1], 10);
    		  }
    	  
    		  // Update the values of the specified sounds.
    		  var ids = self._getSoundIds(id);
    		  for (var i=0; i<ids.length; i++) {
    			sound = self._soundById(ids[i]);
    	  
    			if (sound) {
    			  // Merge the new values into the sound.
    			  var pa = sound._pannerAttr;
    			  pa = {
    				coneInnerAngle: typeof o.coneInnerAngle !== 'undefined' ? o.coneInnerAngle : pa.coneInnerAngle,
    				coneOuterAngle: typeof o.coneOuterAngle !== 'undefined' ? o.coneOuterAngle : pa.coneOuterAngle,
    				coneOuterGain: typeof o.coneOuterGain !== 'undefined' ? o.coneOuterGain : pa.coneOuterGain,
    				distanceModel: typeof o.distanceModel !== 'undefined' ? o.distanceModel : pa.distanceModel,
    				maxDistance: typeof o.maxDistance !== 'undefined' ? o.maxDistance : pa.maxDistance,
    				refDistance: typeof o.refDistance !== 'undefined' ? o.refDistance : pa.refDistance,
    				rolloffFactor: typeof o.rolloffFactor !== 'undefined' ? o.rolloffFactor : pa.rolloffFactor,
    				panningModel: typeof o.panningModel !== 'undefined' ? o.panningModel : pa.panningModel
    			  };
    	  
    			  // Update the panner values or create a new panner if none exists.
    			  var panner = sound._panner;
    			  if (panner) {
    				panner.coneInnerAngle = pa.coneInnerAngle;
    				panner.coneOuterAngle = pa.coneOuterAngle;
    				panner.coneOuterGain = pa.coneOuterGain;
    				panner.distanceModel = pa.distanceModel;
    				panner.maxDistance = pa.maxDistance;
    				panner.refDistance = pa.refDistance;
    				panner.rolloffFactor = pa.rolloffFactor;
    				panner.panningModel = pa.panningModel;
    			  } else {
    				// Make sure we have a position to setup the node with.
    				if (!sound._pos) {
    				  sound._pos = self._pos || [0, 0, -0.5];
    				}
    	  
    				// Create a new panner node.
    				setupPanner(sound, 'spatial');
    			  }
    			}
    		  }
    	  
    		  return self;
    		};
    	  
    		/** Single Sound Methods **/
    		/***************************************************************************/
    	  
    		/**
    		 * Add new properties to the core Sound init.
    		 * @param  {Function} _super Core Sound init method.
    		 * @return {Sound}
    		 */
    		Sound.prototype.init = (function(_super) {
    		  return function() {
    			var self = this;
    			var parent = self._parent;
    	  
    			// Setup user-defined default properties.
    			self._orientation = parent._orientation;
    			self._stereo = parent._stereo;
    			self._pos = parent._pos;
    			self._pannerAttr = parent._pannerAttr;
    	  
    			// Complete initilization with howler.js core Sound's init function.
    			_super.call(this);
    	  
    			// If a stereo or position was specified, set it up.
    			if (self._stereo) {
    			  parent.stereo(self._stereo);
    			} else if (self._pos) {
    			  parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
    			}
    		  };
    		})(Sound.prototype.init);
    	  
    		/**
    		 * Override the Sound.reset method to clean up properties from the spatial plugin.
    		 * @param  {Function} _super Sound reset method.
    		 * @return {Sound}
    		 */
    		Sound.prototype.reset = (function(_super) {
    		  return function() {
    			var self = this;
    			var parent = self._parent;
    	  
    			// Reset all spatial plugin properties on this sound.
    			self._orientation = parent._orientation;
    			self._stereo = parent._stereo;
    			self._pos = parent._pos;
    			self._pannerAttr = parent._pannerAttr;
    	  
    			// If a stereo or position was specified, set it up.
    			if (self._stereo) {
    			  parent.stereo(self._stereo);
    			} else if (self._pos) {
    			  parent.pos(self._pos[0], self._pos[1], self._pos[2], self._id);
    			} else if (self._panner) {
    			  // Disconnect the panner.
    			  self._panner.disconnect(0);
    			  self._panner = undefined;
    			  parent._refreshBuffer(self);
    			}
    	  
    			// Complete resetting of the sound.
    			return _super.call(this);
    		  };
    		})(Sound.prototype.reset);
    	  
    		/** Helper Methods **/
    		/***************************************************************************/
    	  
    		/**
    		 * Create a new panner node and save it on the sound.
    		 * @param  {Sound} sound Specific sound to setup panning on.
    		 * @param {String} type Type of panner to create: 'stereo' or 'spatial'.
    		 */
    		var setupPanner = function(sound, type) {
    		  type = type || 'spatial';
    	  
    		  // Create the new panner node.
    		  if (type === 'spatial') {
    			sound._panner = Howler.ctx.createPanner();
    			sound._panner.coneInnerAngle = sound._pannerAttr.coneInnerAngle;
    			sound._panner.coneOuterAngle = sound._pannerAttr.coneOuterAngle;
    			sound._panner.coneOuterGain = sound._pannerAttr.coneOuterGain;
    			sound._panner.distanceModel = sound._pannerAttr.distanceModel;
    			sound._panner.maxDistance = sound._pannerAttr.maxDistance;
    			sound._panner.refDistance = sound._pannerAttr.refDistance;
    			sound._panner.rolloffFactor = sound._pannerAttr.rolloffFactor;
    			sound._panner.panningModel = sound._pannerAttr.panningModel;
    	  
    			if (typeof sound._panner.positionX !== 'undefined') {
    			  sound._panner.positionX.setValueAtTime(sound._pos[0], Howler.ctx.currentTime);
    			  sound._panner.positionY.setValueAtTime(sound._pos[1], Howler.ctx.currentTime);
    			  sound._panner.positionZ.setValueAtTime(sound._pos[2], Howler.ctx.currentTime);
    			} else {
    			  sound._panner.setPosition(sound._pos[0], sound._pos[1], sound._pos[2]);
    			}
    	  
    			if (typeof sound._panner.orientationX !== 'undefined') {
    			  sound._panner.orientationX.setValueAtTime(sound._orientation[0], Howler.ctx.currentTime);
    			  sound._panner.orientationY.setValueAtTime(sound._orientation[1], Howler.ctx.currentTime);
    			  sound._panner.orientationZ.setValueAtTime(sound._orientation[2], Howler.ctx.currentTime);
    			} else {
    			  sound._panner.setOrientation(sound._orientation[0], sound._orientation[1], sound._orientation[2]);
    			}
    		  } else {
    			sound._panner = Howler.ctx.createStereoPanner();
    			sound._panner.pan.setValueAtTime(sound._stereo, Howler.ctx.currentTime);
    		  }
    	  
    		  sound._panner.connect(sound._node);
    	  
    		  // Update the connections.
    		  if (!sound._paused) {
    			sound._parent.pause(sound._id, true).play(sound._id, true);
    		  }
    		};
    	  })();
    } (Howler$1));

    /* src/MusicController.svelte generated by Svelte v3.57.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/MusicController.svelte";

    function create_fragment$1(ctx) {
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div2;
    	let div0;
    	let button0;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let button1;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let button2;
    	let img3;
    	let img3_src_value;
    	let t3;
    	let div1;
    	let span0;
    	let t5;
    	let input;
    	let t6;
    	let span1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			img1 = element("img");
    			t1 = space();
    			button1 = element("button");
    			img2 = element("img");
    			t2 = space();
    			button2 = element("button");
    			img3 = element("img");
    			t3 = space();
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "0:00";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			span1 = element("span");
    			span1.textContent = "0:00";
    			if (!src_url_equal(img0.src, img0_src_value = "./images/music.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "audio cover");
    			add_location(img0, file$1, 81, 1, 2778);
    			if (!src_url_equal(img1.src, img1_src_value = "./images/next.svg")) attr_dev(img1, "src", img1_src_value);
    			set_style(img1, "rotate", "180deg");
    			attr_dev(img1, "class", "unselectable");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$1, 86, 4, 3026);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "no-border");
    			attr_dev(button0, "title", "previous");
    			add_location(button0, file$1, 85, 3, 2964);
    			if (!src_url_equal(img2.src, img2_src_value = "./images/pause.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "unselectable");
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$1, 90, 4, 3295);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "no-border");
    			attr_dev(button1, "title", "play/pause");
    			add_location(button1, file$1, 88, 3, 3125);
    			if (!src_url_equal(img3.src, img3_src_value = "./images/next.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "unselectable");
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$1, 93, 4, 3429);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "no-border");
    			attr_dev(button2, "title", "next");
    			add_location(button2, file$1, 92, 3, 3371);
    			attr_dev(div0, "class", "flex flex-center");
    			add_location(div0, file$1, 84, 2, 2930);
    			add_location(span0, file$1, 97, 3, 3535);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "0");
    			attr_dev(input, "max", "60");
    			attr_dev(input, "aria-label", "timeline");
    			add_location(input, file$1, 98, 3, 3583);
    			add_location(span1, file$1, 100, 3, 3730);
    			attr_dev(div1, "id", "timeline");
    			add_location(div1, file$1, 96, 2, 3512);
    			attr_dev(div2, "id", "controller");
    			add_location(div2, file$1, 83, 1, 2906);
    			attr_dev(div3, "id", "music-control");
    			add_location(div3, file$1, 80, 0, 2752);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, img0);
    			/*img0_binding*/ ctx[10](img0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(button0, img1);
    			append_dev(div0, t1);
    			append_dev(div0, button1);
    			append_dev(button1, img2);
    			/*button1_binding*/ ctx[11](button1);
    			append_dev(div0, t2);
    			append_dev(div0, button2);
    			append_dev(button2, img3);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			/*span0_binding*/ ctx[13](span0);
    			append_dev(div1, t5);
    			append_dev(div1, input);
    			/*input_binding*/ ctx[14](input);
    			set_input_value(input, /*timelineValue*/ ctx[5]);
    			append_dev(div1, t6);
    			append_dev(div1, span1);
    			/*span1_binding*/ ctx[16](span1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(img0, "error", this.src = 'web/images/music.svg', false, false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[12], false, false, false, false),
    					listen_dev(input, "change", /*timelineUserChange*/ ctx[7], false, false, false, false),
    					listen_dev(input, "change", /*input_change_input_handler*/ ctx[15]),
    					listen_dev(input, "input", /*input_change_input_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*timelineValue*/ 32) {
    				set_input_value(input, /*timelineValue*/ ctx[5]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*img0_binding*/ ctx[10](null);
    			/*button1_binding*/ ctx[11](null);
    			/*span0_binding*/ ctx[13](null);
    			/*input_binding*/ ctx[14](null);
    			/*span1_binding*/ ctx[16](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MusicController', slots, []);
    	let timeline, timelineEnd, timelineState, pausePlayButton;
    	let { playingAudioCover } = $$props;
    	let timelineValue = 0;

    	// Difference between audio start read position (player.seek()) and the timeline
    	let timelineDifference = 0;

    	// ID of the set interval that updates the timeline's state every second
    	let timelineUpdaterID = 0;

    	// Pauses the music and changes the ui based on the change
    	function pause() {
    		$$invalidate(4, pausePlayButton.src = "/web/images/pause.svg", pausePlayButton);
    		player.pause();
    		clearInterval(timelineUpdaterID);
    	}

    	// Plays the music and changes the ui based on the change
    	function play() {
    		$$invalidate(4, pausePlayButton.src = "/web/images/play.svg", pausePlayButton);
    		player.play();

    		// Updating the timeline
    		timelineUpdaterID = setInterval(
    			() => {
    				$$invalidate(1, timeline.value = player.seek() + timelineDifference, timeline);
    				$$invalidate(3, timelineState.textContent = `${Math.round((player.seek() + timelineDifference) / 60)}:${String(Math.round((player.seek() + timelineDifference) % 60)).padStart(2, "0")}`, timelineState);
    			},
    			1000
    		);
    	}

    	function playAudio(audioId, start) {
    		try {
    			player.unload();
    		} catch(err) {
    			window["player"] = new Howler$1.Howl({ src: [``], html5: true });

    			player.on("end", () => {
    				pause();
    				player.seek(0);
    			});
    		}

    		player["audio_id_playing"] = audioId;

    		// Changes the start to 0 if it's not specified (undefined) or if it's any other falsy value
    		start = start ? start : 0;

    		player._src = `/api/v1/audio/${audioId}?start=${start}`;
    		timelineDifference = start;

    		// Getting the audio's duration in seconds from the server and changing the timeline
    		fetch(`/api/v1/audio/${audioId}?query=Duration`).then(result => result.json()).then(duration => {
    			$$invalidate(1, timeline.max = duration, timeline);
    			$$invalidate(2, timelineEnd.textContent = `${Math.round(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}`, timelineEnd);
    		});

    		play();
    	}

    	onMount(() => {
    		timeline.addEventListener("change", timelineUserChange);
    	});

    	function timelineUserChange() {
    		console.log(timeline);
    		playAudio(player.audio_id_playing, timelineValue);
    	}

    	// Starts the song from the position it was paused last time
    	// Note: This function is usually called by the play button
    	function resume() {
    		playAudio(player.audio_id_playing, Math.round(player.seek() + timelineDifference));
    	}

    	// This function is called by every item in the browser
    	function browserItemClick(element) {
    		if (element.getAttribute("data-item-type") == "container") {
    			containerPath.push([element.getAttribute("data-id"), element.getAttribute("data-title")]);
    			return refresh(element.getAttribute("data-id"));
    		}

    		$$invalidate(0, playingAudioCover.src = `/api/v1/audio/${element.getAttribute("data-id")}?query=Cover`, playingAudioCover);
    		playAudio(element.getAttribute("data-id"));
    	}

    	$$self.$$.on_mount.push(function () {
    		if (playingAudioCover === undefined && !('playingAudioCover' in $$props || $$self.$$.bound[$$self.$$.props['playingAudioCover']])) {
    			console_1.warn("<MusicController> was created without expected prop 'playingAudioCover'");
    		}
    	});

    	const writable_props = ['playingAudioCover'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<MusicController> was created with unknown prop '${key}'`);
    	});

    	function img0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			playingAudioCover = $$value;
    			$$invalidate(0, playingAudioCover);
    		});
    	}

    	function button1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			pausePlayButton = $$value;
    			$$invalidate(4, pausePlayButton);
    		});
    	}

    	const click_handler = () => {
    		if (window.player.playing()) {
    			pause();
    		} else {
    			resume();
    		}
    	};

    	function span0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			timelineState = $$value;
    			$$invalidate(3, timelineState);
    		});
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			timeline = $$value;
    			$$invalidate(1, timeline);
    		});
    	}

    	function input_change_input_handler() {
    		timelineValue = to_number(this.value);
    		$$invalidate(5, timelineValue);
    	}

    	function span1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			timelineEnd = $$value;
    			$$invalidate(2, timelineEnd);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('playingAudioCover' in $$props) $$invalidate(0, playingAudioCover = $$props.playingAudioCover);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		timeline,
    		timelineEnd,
    		timelineState,
    		pausePlayButton,
    		playingAudioCover,
    		timelineValue,
    		Howl: Howler$1.Howl,
    		timelineDifference,
    		timelineUpdaterID,
    		pause,
    		play,
    		playAudio,
    		timelineUserChange,
    		resume,
    		browserItemClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('timeline' in $$props) $$invalidate(1, timeline = $$props.timeline);
    		if ('timelineEnd' in $$props) $$invalidate(2, timelineEnd = $$props.timelineEnd);
    		if ('timelineState' in $$props) $$invalidate(3, timelineState = $$props.timelineState);
    		if ('pausePlayButton' in $$props) $$invalidate(4, pausePlayButton = $$props.pausePlayButton);
    		if ('playingAudioCover' in $$props) $$invalidate(0, playingAudioCover = $$props.playingAudioCover);
    		if ('timelineValue' in $$props) $$invalidate(5, timelineValue = $$props.timelineValue);
    		if ('timelineDifference' in $$props) timelineDifference = $$props.timelineDifference;
    		if ('timelineUpdaterID' in $$props) timelineUpdaterID = $$props.timelineUpdaterID;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		playingAudioCover,
    		timeline,
    		timelineEnd,
    		timelineState,
    		pausePlayButton,
    		timelineValue,
    		pause,
    		timelineUserChange,
    		resume,
    		playAudio,
    		img0_binding,
    		button1_binding,
    		click_handler,
    		span0_binding,
    		input_binding,
    		input_change_input_handler,
    		span1_binding
    	];
    }

    class MusicController extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { playingAudioCover: 0, playAudio: 9 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MusicController",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get playingAudioCover() {
    		throw new Error("<MusicController>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set playingAudioCover(value) {
    		throw new Error("<MusicController>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get playAudio() {
    		return this.$$.ctx[9];
    	}

    	set playAudio(value) {
    		throw new Error("<MusicController>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.57.0 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let div8;
    	let div0;
    	let button0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let span0;
    	let t2;
    	let button1;
    	let img1;
    	let img1_src_value;
    	let t3;
    	let span1;
    	let t5;
    	let button2;
    	let img2;
    	let img2_src_value;
    	let t6;
    	let span2;
    	let t8;
    	let button3;
    	let img3;
    	let img3_src_value;
    	let t9;
    	let span3;
    	let t11;
    	let button4;
    	let img4;
    	let img4_src_value;
    	let t12;
    	let span4;
    	let t14;
    	let div5;
    	let form;
    	let div1;
    	let span5;
    	let t16;
    	let button5;
    	let t18;
    	let input0;
    	let t19;
    	let button6;
    	let t21;
    	let div3;
    	let input1;
    	let t22;
    	let img5;
    	let img5_src_value;
    	let t23;
    	let img6;
    	let img6_src_value;
    	let t24;
    	let div2;
    	let input2;
    	let t25;
    	let input3;
    	let t26;
    	let input4;
    	let t27;
    	let button7;
    	let t29;
    	let div4;
    	let t30;
    	let div7;
    	let button8;
    	let div6;
    	let span6;
    	let t31;
    	let span7;
    	let t32;
    	let button9;
    	let img7;
    	let img7_src_value;
    	let t33;
    	let span8;
    	let t35;
    	let browser;
    	let t36;
    	let musiccontroller;
    	let updating_playAudio;
    	let current;
    	let mounted;
    	let dispose;

    	browser = new Browser({
    			props: {
    				viewID: /*viewID*/ ctx[0],
    				playAudio: /*playAudio*/ ctx[1]
    			},
    			$$inline: true
    		});

    	function musiccontroller_playAudio_binding(value) {
    		/*musiccontroller_playAudio_binding*/ ctx[11](value);
    	}

    	let musiccontroller_props = {};

    	if (/*playAudio*/ ctx[1] !== void 0) {
    		musiccontroller_props.playAudio = /*playAudio*/ ctx[1];
    	}

    	musiccontroller = new MusicController({
    			props: musiccontroller_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(musiccontroller, 'playAudio', musiccontroller_playAudio_binding));

    	const block = {
    		c: function create() {
    			div8 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			img0 = element("img");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "Delete";
    			t2 = space();
    			button1 = element("button");
    			img1 = element("img");
    			t3 = space();
    			span1 = element("span");
    			span1.textContent = "Delete Cover";
    			t5 = space();
    			button2 = element("button");
    			img2 = element("img");
    			t6 = space();
    			span2 = element("span");
    			span2.textContent = "Delete Title";
    			t8 = space();
    			button3 = element("button");
    			img3 = element("img");
    			t9 = space();
    			span3 = element("span");
    			span3.textContent = "Delete Singer";
    			t11 = space();
    			button4 = element("button");
    			img4 = element("img");
    			t12 = space();
    			span4 = element("span");
    			span4.textContent = "Edit";
    			t14 = space();
    			div5 = element("div");
    			form = element("form");
    			div1 = element("div");
    			span5 = element("span");
    			span5.textContent = "Drag and Drop";
    			t16 = space();
    			button5 = element("button");
    			button5.textContent = "Select File";
    			t18 = space();
    			input0 = element("input");
    			t19 = space();
    			button6 = element("button");
    			button6.textContent = "Next";
    			t21 = space();
    			div3 = element("div");
    			input1 = element("input");
    			t22 = space();
    			img5 = element("img");
    			t23 = space();
    			img6 = element("img");
    			t24 = space();
    			div2 = element("div");
    			input2 = element("input");
    			t25 = space();
    			input3 = element("input");
    			t26 = space();
    			input4 = element("input");
    			t27 = space();
    			button7 = element("button");
    			button7.textContent = "Submit";
    			t29 = space();
    			div4 = element("div");
    			t30 = space();
    			div7 = element("div");
    			button8 = element("button");
    			div6 = element("div");
    			span6 = element("span");
    			t31 = space();
    			span7 = element("span");
    			t32 = space();
    			button9 = element("button");
    			img7 = element("img");
    			t33 = space();
    			span8 = element("span");
    			span8.textContent = "Upload";
    			t35 = space();
    			create_component(browser.$$.fragment);
    			t36 = space();
    			create_component(musiccontroller.$$.fragment);
    			if (!src_url_equal(img0.src, img0_src_value = "/web/images/garbage-can.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file, 17, 2, 462);
    			add_location(span0, file, 18, 2, 513);
    			attr_dev(button0, "type", "button");
    			add_location(button0, file, 10, 1, 225);
    			if (!src_url_equal(img1.src, img1_src_value = "/web/images/garbage-can.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file, 27, 2, 743);
    			add_location(span1, file, 28, 2, 794);
    			attr_dev(button1, "type", "button");
    			add_location(button1, file, 20, 1, 547);
    			if (!src_url_equal(img2.src, img2_src_value = "/web/images/garbage-can.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file, 40, 2, 1112);
    			add_location(span2, file, 41, 2, 1163);
    			attr_dev(button2, "type", "button");
    			add_location(button2, file, 30, 1, 834);
    			if (!src_url_equal(img3.src, img3_src_value = "/web/images/garbage-can.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file, 52, 2, 1479);
    			add_location(span3, file, 53, 2, 1530);
    			attr_dev(button3, "type", "button");
    			add_location(button3, file, 43, 1, 1203);
    			if (!src_url_equal(img4.src, img4_src_value = "/web/images/pen.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file, 56, 2, 1597);
    			add_location(span4, file, 57, 2, 1640);
    			attr_dev(button4, "type", "button");
    			add_location(button4, file, 55, 1, 1571);
    			attr_dev(div0, "id", "context-menu");
    			attr_dev(div0, "class", "invisible");
    			add_location(div0, file, 9, 0, 181);
    			add_location(span5, file, 83, 2, 2550);
    			attr_dev(button5, "type", "button");
    			attr_dev(button5, "class", "submit");
    			set_style(button5, "width", "8rem");
    			set_style(button5, "margin-bottom", "auto");
    			set_style(button5, "box-shadow", "0 0.25rem 0.75rem 0 var(--gray)");
    			add_location(button5, file, 88, 3, 2796);
    			attr_dev(input0, "id", "upload-audio-file-input");
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "name", "audio");
    			set_style(input0, "display", "none");
    			input0.required = true;
    			attr_dev(input0, "accept", ".mp3, .mpeg, .opus, .ogg, .oga, .wav, .aac, .caf, .m4a, .mp4, .weba, .webm, .dolby, .flac");
    			add_location(input0, file, 92, 3, 3045);
    			attr_dev(div1, "id", "upload-file-section");
    			add_location(div1, file, 78, 1, 2266);
    			attr_dev(button6, "id", "upload-next");
    			attr_dev(button6, "type", "button");
    			attr_dev(button6, "class", "submit no-border no-max-width");
    			add_location(button6, file, 97, 1, 3307);
    			attr_dev(input1, "type", "file");
    			attr_dev(input1, "id", "upload-picture");
    			attr_dev(input1, "name", "cover");
    			attr_dev(input1, "class", "invisible");
    			add_location(input1, file, 103, 2, 3472);
    			if (!src_url_equal(img5.src, img5_src_value = "/web/images/music.svg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "id", "upload-picture-graphic");
    			attr_dev(img5, "alt", "Audio cover");
    			set_style(img5, "cursor", "pointer");
    			add_location(img5, file, 106, 2, 3684);
    			if (!src_url_equal(img6.src, img6_src_value = "/web/images/change-cover-overlay.svg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "id", "upload-picture-graphic-overlay");
    			attr_dev(img6, "alt", "");
    			add_location(img6, file, 109, 2, 3834);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "id", "upload-title");
    			attr_dev(input2, "name", "Title");
    			attr_dev(input2, "maxlength", "50");
    			attr_dev(input2, "placeholder", "Title");
    			attr_dev(input2, "class", "no-max-width");
    			add_location(input2, file, 111, 3, 3940);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "id", "upload-singer");
    			attr_dev(input3, "name", "Singer");
    			attr_dev(input3, "maxlength", "50");
    			attr_dev(input3, "placeholder", "Singer");
    			attr_dev(input3, "class", "no-max-width");
    			add_location(input3, file, 112, 3, 4052);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "id", "upload-format");
    			attr_dev(input4, "name", "Format");
    			attr_dev(input4, "maxlength", "50");
    			attr_dev(input4, "placeholder", "Format");
    			attr_dev(input4, "class", "no-max-width");
    			add_location(input4, file, 113, 3, 4166);
    			add_location(div2, file, 110, 2, 3930);
    			attr_dev(div3, "id", "sound-info");
    			attr_dev(div3, "class", "invisible");
    			add_location(div3, file, 102, 1, 3429);
    			attr_dev(button7, "id", "submit-upload");
    			attr_dev(button7, "type", "submit");
    			attr_dev(button7, "class", "no-max-width invisible");
    			add_location(button7, file, 117, 1, 4320);
    			attr_dev(form, "id", "upload-page");
    			attr_dev(form, "action", "/api/v1/audio");
    			attr_dev(form, "class", "page page-audio-upload");
    			attr_dev(form, "method", "POST");
    			attr_dev(form, "enctype", "multipart/form-data");
    			add_location(form, file, 66, 0, 1942);
    			attr_dev(div4, "class", "page page-audio-edit");
    			add_location(div4, file, 121, 0, 4425);
    			attr_dev(div5, "id", "upload-background");
    			attr_dev(div5, "class", "invisible");
    			add_location(div5, file, 62, 0, 1768);
    			add_location(span6, file, 130, 3, 4669);
    			add_location(div6, file, 129, 2, 4659);
    			add_location(span7, file, 132, 2, 4696);
    			attr_dev(button8, "type", "button");
    			attr_dev(button8, "id", "quick-access-profile");
    			attr_dev(button8, "class", "black no-shadow");
    			add_location(button8, file, 128, 1, 4547);
    			if (!src_url_equal(img7.src, img7_src_value = "./images/upload.svg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			add_location(img7, file, 136, 2, 4849);
    			add_location(span8, file, 137, 2, 4891);
    			attr_dev(button9, "type", "button");
    			attr_dev(button9, "id", "quick-access-upload");
    			attr_dev(button9, "title", "upload");
    			attr_dev(button9, "class", "black no-shadow");
    			add_location(button9, file, 134, 1, 4724);
    			attr_dev(div7, "id", "quick-access");
    			add_location(div7, file, 127, 0, 4521);
    			attr_dev(div8, "id", "container");
    			add_location(div8, file, 8, 0, 159);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div0);
    			append_dev(div0, button0);
    			append_dev(button0, img0);
    			append_dev(button0, t0);
    			append_dev(button0, span0);
    			append_dev(div0, t2);
    			append_dev(div0, button1);
    			append_dev(button1, img1);
    			append_dev(button1, t3);
    			append_dev(button1, span1);
    			append_dev(div0, t5);
    			append_dev(div0, button2);
    			append_dev(button2, img2);
    			append_dev(button2, t6);
    			append_dev(button2, span2);
    			append_dev(div0, t8);
    			append_dev(div0, button3);
    			append_dev(button3, img3);
    			append_dev(button3, t9);
    			append_dev(button3, span3);
    			append_dev(div0, t11);
    			append_dev(div0, button4);
    			append_dev(button4, img4);
    			append_dev(button4, t12);
    			append_dev(button4, span4);
    			append_dev(div8, t14);
    			append_dev(div8, div5);
    			append_dev(div5, form);
    			append_dev(form, div1);
    			append_dev(div1, span5);
    			append_dev(div1, t16);
    			append_dev(div1, button5);
    			append_dev(div1, t18);
    			append_dev(div1, input0);
    			append_dev(form, t19);
    			append_dev(form, button6);
    			append_dev(form, t21);
    			append_dev(form, div3);
    			append_dev(div3, input1);
    			append_dev(div3, t22);
    			append_dev(div3, img5);
    			append_dev(div3, t23);
    			append_dev(div3, img6);
    			append_dev(div3, t24);
    			append_dev(div3, div2);
    			append_dev(div2, input2);
    			append_dev(div2, t25);
    			append_dev(div2, input3);
    			append_dev(div2, t26);
    			append_dev(div2, input4);
    			append_dev(form, t27);
    			append_dev(form, button7);
    			append_dev(div5, t29);
    			append_dev(div5, div4);
    			append_dev(div8, t30);
    			append_dev(div8, div7);
    			append_dev(div7, button8);
    			append_dev(button8, div6);
    			append_dev(div6, span6);
    			append_dev(button8, t31);
    			append_dev(button8, span7);
    			append_dev(div7, t32);
    			append_dev(div7, button9);
    			append_dev(button9, img7);
    			append_dev(button9, t33);
    			append_dev(button9, span8);
    			append_dev(div8, t35);
    			mount_component(browser, div8, null);
    			append_dev(div8, t36);
    			mount_component(musiccontroller, div8, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "mouseup", /*mouseup_handler*/ ctx[4], false, false, false, false),
    					listen_dev(
    						button1,
    						"mouseup",
    						function () {
    							if (is_function(fetch(`/api/v1/audio/${this.parentElement.getAttribute('data-id')}?query=Cover`, { method: 'DELETE' }).then(/*mouseup_handler_1*/ ctx[5]))) fetch(`/api/v1/audio/${this.parentElement.getAttribute('data-id')}?query=Cover`, { method: 'DELETE' }).then(/*mouseup_handler_1*/ ctx[5]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						button2,
    						"mouseup",
    						function () {
    							if (is_function(fetch('/api/v1/audio/' + this.parentElement.getAttribute('data-id'), {
    								method: 'PATCH',
    								headers: { 'Content-Type': 'application/json' },
    								body: JSON.stringify({ Title: '' })
    							}).then(/*mouseup_handler_2*/ ctx[6]))) fetch('/api/v1/audio/' + this.parentElement.getAttribute('data-id'), {
    								method: 'PATCH',
    								headers: { 'Content-Type': 'application/json' },
    								body: JSON.stringify({ Title: '' })
    							}).then(/*mouseup_handler_2*/ ctx[6]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(
    						button3,
    						"mouseup",
    						function () {
    							if (is_function(fetch('/api/v1/audio/' + this.parentElement.getAttribute('data-id'), {
    								method: 'PATCH',
    								headers: { 'Content-Type': 'application/json' },
    								body: JSON.stringify({ Singer: '' })
    							}).then(/*mouseup_handler_3*/ ctx[7]))) fetch('/api/v1/audio/' + this.parentElement.getAttribute('data-id'), {
    								method: 'PATCH',
    								headers: { 'Content-Type': 'application/json' },
    								body: JSON.stringify({ Singer: '' })
    							}).then(/*mouseup_handler_3*/ ctx[7]).apply(this, arguments);
    						},
    						false,
    						false,
    						false,
    						false
    					),
    					listen_dev(span5, "drop", /*drop_handler*/ ctx[8], false, false, false, false),
    					listen_dev(span5, "dragenter", this.parentElement.classList.add('active-drop'), false, false, false, false),
    					listen_dev(span5, "dragover", prevent_default(/*dragover_handler_1*/ ctx[3]), false, true, false, false),
    					listen_dev(button5, "click", document.getElementById('upload-audio-file-input').click(), false, false, false, false),
    					listen_dev(input0, "change", fillUploadForm(this.files[0]), false, false, false, false),
    					listen_dev(div1, "drop", /*drop_handler_1*/ ctx[9], false, false, false, false),
    					listen_dev(div1, "dragenter", this.classList.toggle('active-drop', true), false, false, false, false),
    					listen_dev(div1, "dragleave", this.classList.toggle('active-drop', false), false, false, false, false),
    					listen_dev(div1, "dragover", prevent_default(/*dragover_handler*/ ctx[2]), false, true, false, false),
    					listen_dev(input1, "change", uploadPictureGraphic.src = toDataURI(uploadPicture.files[0]), false, false, false, false),
    					listen_dev(img5, "click", uploadPicture.click(), false, false, false, false),
    					listen_dev(form, "submit", /*submit_handler*/ ctx[10], false, false, false, false),
    					listen_dev(div5, "click", click_handler, false, false, false, false),
    					listen_dev(button8, "click", location.href = '/login', false, false, false, false),
    					listen_dev(button9, "click", page('audio-upload'), false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			const browser_changes = {};
    			if (dirty & /*viewID*/ 1) browser_changes.viewID = /*viewID*/ ctx[0];
    			if (dirty & /*playAudio*/ 2) browser_changes.playAudio = /*playAudio*/ ctx[1];
    			browser.$set(browser_changes);
    			const musiccontroller_changes = {};

    			if (!updating_playAudio && dirty & /*playAudio*/ 2) {
    				updating_playAudio = true;
    				musiccontroller_changes.playAudio = /*playAudio*/ ctx[1];
    				add_flush_callback(() => updating_playAudio = false);
    			}

    			musiccontroller.$set(musiccontroller_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(browser.$$.fragment, local);
    			transition_in(musiccontroller.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(browser.$$.fragment, local);
    			transition_out(musiccontroller.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div8);
    			destroy_component(browser);
    			destroy_component(musiccontroller);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const click_handler = event => {
    	if (event.target == undefined) {
    		undefined.classList.toggle('invisible', true);
    	}
    };

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let viewID = "";
    	let playAudio;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function dragover_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function dragover_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	const mouseup_handler = () => {
    		fetch(`/api/v1/${this.parentElement.getAttribute('data-item-type')}/${this.parentElement.getAttribute('data-id')}`, { method: 'DELETE' }).then(() => {
    			$$invalidate(0, viewID);
    		});
    	};

    	const mouseup_handler_1 = () => $$invalidate(0, viewID);
    	const mouseup_handler_2 = () => $$invalidate(0, viewID);
    	const mouseup_handler_3 = () => $$invalidate(0, viewID);

    	const drop_handler = () => {
    		fileDropForUpload(event, this.parentElement);
    		this.parentElement.classList.add('active-drop');
    	};

    	const drop_handler_1 = () => {
    		fileDropForUpload(event, this);
    		this.classList.toggle('active-drop', false);
    	};

    	const submit_handler = () => {
    		fetch('/api/v1/audio/', { method: 'POST', body: new FormData(this) }).then(() => {
    			$$invalidate(0, viewID);
    			this.reset();
    		}); // uploadPage()

    		return false;
    	};

    	function musiccontroller_playAudio_binding(value) {
    		playAudio = value;
    		$$invalidate(1, playAudio);
    	}

    	$$self.$capture_state = () => ({
    		Browser,
    		MusicController,
    		viewID,
    		playAudio
    	});

    	$$self.$inject_state = $$props => {
    		if ('viewID' in $$props) $$invalidate(0, viewID = $$props.viewID);
    		if ('playAudio' in $$props) $$invalidate(1, playAudio = $$props.playAudio);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		viewID,
    		playAudio,
    		dragover_handler,
    		dragover_handler_1,
    		mouseup_handler,
    		mouseup_handler_1,
    		mouseup_handler_2,
    		mouseup_handler_3,
    		drop_handler,
    		drop_handler_1,
    		submit_handler,
    		musiccontroller_playAudio_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=indexBundle.js.map

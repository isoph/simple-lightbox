/**
 * Core
 * @package SLB
 * @author Archetyped
 */
if ( window.jQuery ){(function($) {

/**
 * Extendible class
 * Adapted from John Resig
 * @link http://ejohn.org/blog/simple-javascript-inheritance/ 
 */
var c_init = false;
var Class = function() {};

/**
 * Create class that extends another class
 * @param object members Child class' properties
 * @return function New class
 */
Class.extend = function(members) {
	var _super = this.prototype;
	
	//Copy instance to prototype
	c_init = true;
	var proto = new this();
	c_init = false;
	
	var val, name; 
	//Scrub prototype objects (Decouple from super class)
	for ( name in proto ) {
		if ( $.isPlainObject(proto[name]) ) {
			val = $.extend({}, proto[name]);
			proto[name] = val;
		}
	}
	
	/**
	 * Create class method with access to super class method
	 * @param string nm Method name
	 * @param function fn Class method
	 * @return function Class method with access to super class method
	 */
	var make_handler = function(nm, fn) {
		return function() {
			//Cache super variable
			var tmp = this._super;
			//Set variable to super class method
			this._super = _super[nm];
			//Call method
			var ret = fn.apply(this, arguments);
			//Restore super variable
			this._super = tmp;
			//Return value
			return ret;
		};
	};
	//Copy properties to Class
	for ( name in members ) {
		//Add access to super class method to methods
		if ( 'function' === typeof members[name] && 'function' === typeof _super[name] ) {
			proto[name] = make_handler(name, members[name]);
		} else {
			//Transfer properties
			//Objects are copied, not referenced
			proto[name] = ( $.isPlainObject(members[name]) ) ? $.extend({}, members[name]) : members[name];
		}
	}
	
	/**
	 * Class constructor
	 * Supports pre-construction initilization (`Class._init()`)
	 * Supports passing constructor for new classes (`Class._c()`)
	 */
	function Class() {
		if ( !c_init ) {
			//Private initialization
			if ( 'function' === typeof this._init ) {
				this._init.apply(this, arguments);
			}
			//Main Constructor
			if ( 'function' === typeof this._c ) {
				this._c.apply(this, arguments);
			}
		}
	}
	
	
	//Populate new prototype
	Class.prototype = proto;
	
	//Set constructor
	Class.prototype.constructor = Class;
	
	//Set extender
	Class.extend = this.extend;
	
	//Return function
	return Class;
};

/**
 * Base Class
 */
var Base = {
	/* Properties */
	
	/**
	 * Base object flag
	 * @var bool
	 */
	base: false,
	/**
	 * Instance parent
	 * @var object
	 */
	_parent: null,
	/**
	 * Class prefix
	 * @var string
	 */
	prefix: 'slb',
	
	/* Methods */
	
	/**
	 * Constructor
	 * Sets instance parent
	 */
	_init: function() {
		this._set_parent();
	},
	
	/**
	 * Set instance parent
	 * Set utilities parent to current instance
	 * @param obj p Parent instance
	 */
	_set_parent: function(p) {
		if ( 'undefined' !== typeof p ) {
			this._parent = p;
		}
		this.util._parent = this;
	},
	
	/**
	 * Attach new member to instance
	 * Member can be property (value) or method
	 * @param string name Member name
	 * @param object data Member data
	 * @param bool simple (optional) Save new member as data object or new class instance (Default: new instance)
	 */
	attach: function(member, data, simple) {
		//Validate
		simple = ( typeof simple === 'undefined' ) ? false : !!simple;
		//Add member to instance
		if ( 'string' === $.type(member) ) {
			//Prepare member value
			if ( $.isPlainObject(data) && !simple ) {
				//Set parent reference for attached instance
				data['_parent'] = this;
				//Define new class
				data = this.Class.extend(data);
			}
			//Save member to current instance
			//Initialize new instance if data is a class
			this[member] = ( 'function' === $.type(data) ) ? new data() : data; 
		}
	},
	
	/**
	 * Check for child object
	 * Child object can be multi-level (e.g. Child.Level2child.Level3child)
	 * 
	 * @param string child Name of child object
	 */
	has_child: function(child) {
		//Validate
		if ( !this.util.is_string(child) ) {
			return false;
		}
		
		var children = child.split('.');
		child = null;
		var o = this;
		var x;
		for ( x = 0; x < children.length; x++ ) {
			child = children[x];
			if ( "" === child ) {
				continue;
			}
			if ( this.util.is_obj(o) && o[child] ) {
				o = o[child];
			} else {
				return false;
			}
		}
		return true;
	},
	
	/**
	 * Check if instance is set as a base
	 * @uses base
	 * @return bool TRUE if object is set as a base
	 */
	is_base: function() {
		return !!this.base;
	},
	
	/**
	 * Get parent instance
	 * @uses `Base._parent` property
	 * @return obj Parent instance
	 */
	get_parent: function() {
		var p = this._parent;
		// Validate
		if ( !p ) {
			this._parent = {};
		}
		return this._parent;
	}
};

/**
 * Utility methods
 */
var Utilities =  {
	/* Properties  */
	
	_base: null,
	_parent: null,
	
	/* Methods */
	
	/**
	 * Get base ancestor
	 * @return obj Base ancestor
	 */
	get_base: function() {
		if ( !this._base ) {
			var p = this.get_parent();
			var p_prev = null;
			var methods = ['is_base', 'get_parent'];
			// Find base ancestor
			// Either oldest ancestor or object explicitly set as a base
			while ( ( p_prev !== p ) && this.is_method(p, methods) && !p.is_base() ) {
				// Save previous parent
				p_prev = p;
				// Get new parent
				p = p.get_parent();
			}
			//Set base
			this._base = p;
		}
		return this._base;
	},
	
	/**
	 * Get parent object or parent property value
	 * @param string prop (optional) Property to retrieve
	 * @return obj Parent object or property value
	 */
	get_parent: function(prop) {
		var ret = this._parent;
		// Validate
		if ( !ret ) {
			// Set default parent value
			ret = this._parent = {};
		}
		// Get parent property
		if ( this.is_string(prop) ) {
			ret = ( this.in_obj(ret, prop) ) ? ret[prop] : null;
		}
		return ret;
	},
	
	/**
	 * Retrieve valid separator
	 * If supplied argument is not a valid separator, use default separator
	 * @param string (optional) sep Separator text
	 * @return string Separator text
	 */
	get_sep: function(sep) {
		var sep_default = '_';
		return ( this.is_string(sep, false) ) ? sep : sep_default;
	},
	
	/**
	 * Retrieve prefix
	 * @return string Prefix
	 */
	get_prefix: function() {
		var p = this.get_parent('prefix');
		return ( this.is_string(p) ) ? p : '';
	},
	
	/**
	 * Check if string is prefixed
	 */
	has_prefix: function(val, sep) {
		return ( this.is_string(val) && 0 === val.indexOf(this.get_prefix() + this.get_sep(sep)) );
	},
	
	/**
	 * Add Prefix to a string
	 * @param string val Value to add prefix to
	 * @param string sep (optional) Separator (Default: `_`)
	 * @param bool (optional) once If text should only be prefixed once (Default: TRUE)
	 */
	add_prefix: function(val, sep, once) {
		//Validate
		if ( !this.is_string(val) ) {
			//Return prefix if value to add prefix to is empty
			return this.get_prefix();
		}
		sep = this.get_sep(sep);
		if ( !this.is_bool(once) ) {
			once = true;
		}
		
		return ( once && this.has_prefix(val, sep) ) ? val : [this.get_prefix(), val].join(sep);
	},
	
	/**
	 * Remove Prefix from a string
	 * @param string val Value to add prefix to
	 * @param string sep (optional) Separator (Default: `_`)
	 * @param bool (optional) once If text should only be prefixed once (Default: true)
	 * @return string Original value with prefix removed
	 */
	remove_prefix: function(val, sep, once) {
		//Validate parameters
		if ( !this.is_string(val, true) ) {
			return '';
		}
		//Default values
		sep = this.get_sep(sep);
		if ( !this.is_bool(once) ) {
			once = true;
		}
		//Check if string is prefixed
		if ( this.has_prefix(val, sep) ) {
			//Remove prefix
			var prfx = this.get_prefix() + sep;
			do {
				val = val.substr(prfx.length);
			} while ( !once && this.has_prefix(val, sep) );
		}
		return val;
	},
	
	/*
	 * Get attribute name
	 * @param string attr_base Attribute's base name
	 * @return string Fully-formed attribute name
	 */
	get_attribute: function(attr_base) {
		//Setup
		var sep = '-';
		var top = 'data';
		//Validate
		var attr = [top, this.get_prefix()].join(sep);
		//Process
		if ( this.is_string(attr_base) && 0 !== attr_base.indexOf(attr + sep) ) {
			attr = [attr, attr_base].join(sep);
		}
		return attr;
	},
	
	/* Request */
	
	/**
	 * Retrieve valid context
	 * @return array Context
	 */
	get_context: function() {
		// Validate
		var b = this.get_base();
		if ( !$.isArray(b.context) ) {
			b.context = [];
		}
		// Return context
		return b.context;
	},
			
	/**
	 * Check if a context exists in current request
	 * If multiple contexts are supplied, result will be TRUE if at least ONE context exists
	 * 
	 * @param string|array ctx Context to check for
	 * @return bool TRUE if context exists, FALSE otherwise
	 */
	is_context: function(ctx) {
		//Validate context
		if ( this.is_string(ctx) ) {
			ctx = [ctx];
		}
		return ( this.is_array(ctx) && this.arr_intersect(this.get_context(), ctx).length > 0 );
	},
	
	/* Helpers */
	
	/**
	 * Check if value is set/defined
	 * @param mixed val Value to check
	 * @return bool TRUE if value is defined
	 */
	is_set: function(val) {
		return ( typeof val !== 'undefined' );
	},
	
	/**
	 * Validate data type
	 * @param mixed val Value to validate
	 * @param mixed type Data type to compare with (function gets for instance, string checks data type)
	 * @param bool nonempty (optional) Check for empty value? (Default: TRUE)
	 * @return bool TRUE if Value matches specified data type
	 */
	is_type: function(val, type, nonempty) {
		var ret = false;
		if ( this.is_set(val) && null !== val && this.is_set(type) ) {
			switch ( $.type(type) ) {
				case 'function':
					ret = ( val instanceof type ) ? true : false;
					break;
				case 'string':
					ret = ( $.type(val) === type ) ? true : false;
					break;
				default:
					ret = false;
					break;
			}
		}
		
		//Validate empty values
		if ( ret && ( !this.is_set(nonempty) || !!nonempty ) ) {
			ret = !this.is_empty(val);
		}
		return ret;
	},
	
	/**
	 * Check if value is a string
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @param bool nonempty (optional) Check for empty value? (Default: TRUE)
	 * @return bool TRUE if value is a valid string
	 */
	is_string: function(value, nonempty) {
		return this.is_type(value, 'string', nonempty);
	},
	
	/**
	 * Check if value is an array
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @param bool nonempty (optional) Check for empty value? (Default: TRUE)
	 * @return bool TRUE if value is a valid array
	 */
	is_array: function(value, nonempty) {
		return ( this.is_type(value, 'array', nonempty) );
	},
	
	/**
	 * Check if value is a boolean
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @return bool TRUE if value is a valid boolean
	 */
	is_bool: function(value) {
		return this.is_type(value, 'boolean', false);
	},
	
	/**
	 * Check if value is an object
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @param bool nonempty (optional) Check for empty value? (Default: TRUE)
	 * @return bool TRUE if value is a valid object
	 */
	is_obj: function(value, nonempty) {
		return this.is_type(value, 'object', nonempty);
	},
	
	/**
	 * Check if value is a function
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @return bool TRUE if value is a valid function
	 */
	is_func: function(value) {
		return this.is_type(value, 'function', false);
	},
	
	/**
	 * Checks if an object has a method
	 * @param obj obj Object to check
	 * @param string|array key Name(s) of methods to check for
	 * @return bool TRUE if method(s) exist, FALSE otherwise
	 */
	is_method: function(obj, key) {
		var ret = false;
		if ( this.is_string(key) ) {
			key = [key];
		}
		if ( this.in_obj(obj, key) ) {
			ret = true;
			var x = 0;
			while ( ret && x < key.length ) {
				ret = this.is_func(obj[key[x]]);
				x++;
			}
		}
		return ret;
	},
	
	/**
	 * Check if value is a number
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @param bool nonempty (optional) Check for empty value? (Default: TRUE)
	 * @return bool TRUE if value is a valid number
	 */
	is_num: function(value, nonempty) {
		var f = {
			'nan': ( Number.isNaN ) ? Number.isNaN : isNaN,
			'finite': ( Number.isFinite ) ? Number.isFinite : isFinite
		};
		return ( this.is_type(value, 'number', nonempty) && !f.nan(value) && f.finite(value) );
	},
	
	/**
	 * Check if value is a integer
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @param bool nonempty (optional) Check for empty value? (Default: TRUE)
	 * @return bool TRUE if value is a valid integer
	 */
	is_int: function(value, nonempty) {
		return ( this.is_num(value, nonempty) && Math.floor(value) === value );
	},
	
	/**
	 * Check if value is scalar (string, number, boolean)
	 * @uses is_type()
	 * @param mixed value Value to check
	 * @param bool nonempty (optional) Check for empty value? (Default: TRUE)
	 * @return bool TRUE if value is scalar
	 */
	is_scalar: function(value, nonempty) {
		return ( this.is_num(value, nonempty) || this.is_string(value, nonempty) || this.is_bool(value) );
	},
	
	/**
	 * Checks if value is empty
	 * @param mixed value Value to check
	 * @param string type (optional) Data type
	 * @return bool TRUE if value is empty, FALSE if not empty
	 */
	is_empty: function(value, type) {
		var ret = false;
		//Initial check for empty value
		if ( !this.is_set(value) || null === value || false === value ) {
			ret = true;
		} else {
			//Validate type
			if ( !this.is_set(type) ) {
				type = $.type(value);
			}
			//Type-based check
			if ( this.is_type(value, type, false) ) {
				switch ( type ) {
					case 'string':
					case 'array':
						if ( value.length === 0 ) {
							ret = true;
						}
						break;
					case 'object':
						//Only evaluate literal objects
						ret = ( $.isPlainObject(value) && !$.map(value, function(v, key) { return key; }).length );
						break;
					case 'number':
						ret = ( value === 0 );
						break;
				}
			} else {
				ret = true;
			}
		}
		return ret;
	},
	
	/**
	 * Check if object is a jQuery.Promise instance
	 * Will also match (but not guarantee) jQuery.Deferred instances
	 * @uses is_method()
	 * @param obj obj Object to check 
	 * @return bool TRUE if object is Promise/Deferred
	 */
	is_promise: function(obj) {
		return ( this.is_obj(obj) && this.is_method(obj, ['then', 'done', 'always', 'fail', 'pipe']) );
	},
	
	/**
	 * Return formatted string
	 */
	format: function(fmt, val) {
		if ( !this.is_string(fmt) ) {
			return '';
		}
		var params = [],
			ph = '%s';
		//Stop processing if no replacement values specified or format string contains no placeholders
		if ( arguments.length < 2 || fmt.indexOf(ph) === -1 ) {
			return fmt;
		}
		//Get replacement values
		params = Array.prototype.slice.call(arguments, 1);
		val = null;
		//Replace placeholders in string with parameters
		
		//Replace all placeholders at once if single parameter set
		if ( params.length === 1 ) {
			fmt = fmt.replace(ph, params[0].toString());
		} else {
			var idx = 0,
				len = params.length,
				pos = 0;
			while ( ( pos = fmt.indexOf(ph) ) && idx < len ) {
				fmt = fmt.substr(0, pos) + params[idx].toString() + fmt.substr(pos + ph.length);
				idx++;
			}
			//Remove any remaining placeholders
			fmt = fmt.replace(ph, '');
		}
		return fmt;
	},
	
	/**
	 * Checks if key(s) exist in an object
	 * @param object obj Object to check
	 * @param string|array key Key(s) to check for in object
	 * @return bool TRUE if key(s) exist in object, FALSE otherwise
	 */
	in_obj: function(obj, key, all) {
		//Validate
		if ( !this.is_bool(all) ) {
			all = true;
		}
		if ( this.is_string(key) ) {
			key = [key];
		}
		var ret = false;
		if ( this.is_obj(obj) && this.is_array(key) ) {
			var val;
			for ( var x = 0; x < key.length; x++ ) {
				val = key[x];
				ret = ( this.is_string(val) && ( val in obj ) ) ? true : false;
				//Stop processing if conditions have been met
				if ( ( !all && ret ) || ( all && !ret ) ) {
					break;
				}
			}
		}
		return ret;
	},
	
	/**
	 * Find common elements of 2 arrays
	 * @param array arr1 First array
	 * @param array arr2 Second array
	 * @return array Elements common to both arrays
	 */
	arr_intersect: function(arr1, arr2) {
		var ret = [];
		if ( arr1 === arr2 ) {
			return arr2;
		}
		if ( !$.isArray(arr2) || !arr2.length || !arr1.length ) {
			return ret;
		}
		//Compare elements in arrays
		var a1;
		var a2;
		var val;
		if ( arr1.length < arr2.length ) {
			a1 = arr1;
			a2 = arr2;
		} else {
			a1 = arr2;
			a2 = arr1;
		}

		for ( var x = 0; x < a1.length; x++ ) {
			//Add mutual elements into intersection array
			val = a1[x];
			if ( a2.indexOf(val) !== -1 && ret.indexOf(val) === -1 ) {
				ret.push(val);
			}
		}
		
		//Return intersection results
		return ret;
	}
};

// Attach Utilities
Base.attach('util', Utilities, true);

/**
 * SLB Base Class
 */
var SLB_Base = Class.extend(Base);

//Init global object
var Core = {
	/* Properties */
	
	base: true,
	context: [],
	
	/**
	 * New object initializer
	 * @var obj
	 */
	Class: SLB_Base,
	
	/* Methods */
	
	/**
	 * Setup client
	 * Set variables, DOM, etc.
	 */
	setup_client: function() {
		/* Quick Hide */
		$('html').addClass(this.util.get_prefix());
	}
};
var SLB_Core = SLB_Base.extend(Core);

this.SLB = new SLB_Core();

this.SLB.setup_client();

})(jQuery);}
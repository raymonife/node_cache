// author : qiuzhuo/raymonife/FUN.tv
/*
	purpose：为计数服务提供一个本地缓存，以减少不必要的对redis访问
*/
var _ = require("lodash");
var _timeoutToExpire = function(timeout){
	if(timeout && _.isNumber(timeout) === false && timeout <= 0){
		throw new Error("Cache timeout must be a number.");
	}
	return timeout * 1000 + Date.now();
}

function Cache(options){
	this.options = options;
	this.data = {};
	this.coldData = {};
	this.stats = {
		hits: 0,
		misses: 0,
		moved: 0,
		size: 0
	};
	_.extend(this.options, {
		"checkRotate": 600000,
		"maxSizes": 80000
	});
	setInterval(function(){}, this.checkRotate);
}


// 定时清理过期的key 
Cache.prototype._checkData = function(){
	if(this.stats.size <= this.options.maxSizes) return;
	this.coldData = this.data;
	this.data = {};
}


Cache.prototype.get = function(key){
	var t = this.getFromCache(this.data, key);
	if(t === null){
		t = this.getFromCache(this.coldData, key);
		if(t !== null) this.moveKey(key);
	}
	if(t === null) this.stats.misses++;
	return t;
}


Cache.prototype.moveKey = function(key){
	this.data[key] = this.coldData[key];
	this.coldData[key] = null;
	this.stats.moved++;
}


// 从缓存中获取内容
Cache.prototype.getFromCache = function(cache, key){
	if(cache[key] && this._checkKey(cache, key)){
		this.stats.hits++;
		return this.data[key].v;
	}else{
		return null;
	}
}


// 检查缓存中的key是否还有效，如果已过期，删掉
Cache.prototype._checkKey = function(cache, key){
	var value = cache[key];
	if(value.e !== 0 && value.e <= Date.now()){
		this.del(cache, key);
		return false;
	}
	return true;
}


// 向缓存中添加内容，并设置过期时间。PS. 此操作会覆盖已有的过期时间设置。
Cache.prototype.set = function(key, value, expire){
	var expires = expire? _timeoutToExpire(expire) : this.options.defaultTimeout;
	if(this.data[key] === null) this.stats.size++;
	this.data[key] = {
		e: expires,
		v: value
	}
}


// 仅修改某个key的value值，保持过期时间不变
Cache.prototype.setValue = function(key, value){
	if(this.data[key] === null){
		this.stats.size++;
		this.data[key] = {};
	}
	this.data[key].v = value;
}


// 为缓存的内容添加过期时间
Cache.prototype.expire = function(key, time){
	if(this.data[key]){
		var expires = _timeoutToExpire(time);
		this.data[key].e = expires;
	}else{
		throw new Error("Key:" + key + " is not exists.expire() must set for an exist key.");
	}
}


// 删除缓存内容
Cache.prototype.del = function(key){
	this.data[key] = null;
	this.coldData[key] = null;
	this.stats.size--;
}

// 对缓存内容进行 +1 操作
Cache.prototype.incr = function(key){
	if(this.data[key]){
		if(_.isNumber(this.data[key].v) === false){
			throw new Error("Incr key must be an number.")
		}
		this.data[key].v++;
	}else if (this.coldData[key]){
		if(_.isNumber(this.coldData[key].v) === false){
			throw new Error("Incr key must be an number.")
		}
		this.data[key].v = this.coldData[key].v++;
		this.coldData[key] = null;
	}else{
		this.stats.size++;
		this.data[key] = {
			e: 0,
			v: 1
		}
	}
}


// 对缓存内容进行 -1 操作
Cache.prototype.decr = function(key){
	if(this.data[key]){
		if(_.isNumber(this.data[key].v) === false){
			throw new Error("Incr key must be an number.")
		}
		this.data[key].v--;
	}else if (this.coldData[key]){
		if(_.isNumber(this.coldData[key].v) === false){
			throw new Error("Incr key must be an number.")
		}
		this.data[key].v = this.coldData[key].v--;
		this.coldData[key] = null;
	}else{
		this.stats.size++;
		this.data[key] = {
			e: 0,
			v: -1
		}
	}
}


// 清空缓存
Cache.prototype.flushAll = function(){
	this.data = {};
	this.coldData = {};
	this.stats.size = 0;
}


Cache.prototype.stats = function(){
	return JSON.parse(JSON.stringify(this.stats));
}

module.exports = Cache;
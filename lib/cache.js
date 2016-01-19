// author : qiuzhuo/raymonife/FUN.tv
/*
	purpose：为计数服务提供一个本地缓存，以减少不必要的对redis访问
*/
var _ = require("lodash");
function Cache(options){
	this.options = options;
	this.data = {};
	this.stats = {
		hits: 0,
		misses: 0,
		size: 0
	};
	this.options = _.extend({
		checkPeriod: 120000,
		// defaultTimeout: 3000000
	})
	// this.defaultTimeout = this.options.defaultTimeout;
	setInterval(this._checkData, this.options.checkPeriod);
}


// 定时清理过期的key 
Cache.prototype._checkData = function(){
	var now = Date.now()
	var ref = this.data;
	for(var key in ref){
		var value = ref[key];
		if(value.e !==0 && value.e < now){
			this.del(key);
		}
	}
}


// 从缓存中获取内容
Cache.prototype.get = function(key){
	if(this.data[key] && this._checkKey(key)){
		this.stats.hits++;
		return this.data[key].v;
	}else{
		this.stats.misses++;
		return null;
	}
}


// 检查缓存中的key是否还有效，如果已过期，删掉
Cache.prototype._checkKey = function(key){
	var value = this.data[key];
	if(value.e !== 0 && value.e < Date.now()){
		this.del(key);
		return false;
	}
	return true;
}


Cache.prototype._checkTTL = function(ttl){
	if(ttl && _.isNumber(ttl) === false && ttl <= 0){
		throw new Error("Cache timeout must be a number.");
	}
}


// 向缓存中添加内容，并设置过期时间。PS. 此操作会覆盖已有的过期时间设置。
Cache.prototype.set = function(key, value, ttl){
	this._checkTTL(ttl);
	var expires = ttl? Date.now() + ttl * 1000 : 0;
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
	this._checkTTL(time);
	if(this.data[key]){
		var expires = time? Date.now() + time * 1000 : 0;
		this.data[key].e = expires;
	}else{
		throw new Error("Key:" + key + " is not exists.expire() must set for an exist key.");
	}
}


// 删除缓存内容
Cache.prototype.del = function(key){
	delete this.data[key];
	this.stats.size--;
}


// 对缓存内容进行 +1 操作
Cache.prototype.incr = function(key){
	if(this.data[key]){
		if(_.isNumber(this.data[key] === false)){
			throw new Error("Incr key must be an number.")
		}
		this.data[key]++;
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
		if(_.isNumber(this.data[key] === false)){
			throw new Error("Incr key must be an number.")
		}
		this.data[key]--;
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
	this.stats.size = 0;
}


Cache.prototype.stats = function(){
	return JSON.parse(JSON.stringify(this.stats));
}

module.exports = Cache;
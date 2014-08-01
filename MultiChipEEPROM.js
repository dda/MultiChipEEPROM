#!/usr/local/bin/tessel run

var atmel24C256=32768;
var atmel24C512=65536;
var atmel24C1024=131072;

tessel = require('tessel');

var MultiChipEEPROM=function(myPort, addresses, capacities) {
  this.devices=[];
  this.firstAddresses=[];
  this.lastAddresses=[];
  var ref=0;
  this.port = tessel.port[myPort];
  var i, j;
  j=addresses.length;
  for (i=0; i<j; i++) {
    var newi2c = new this.port.I2C(addresses[i]);
    this.devices.push(newi2c);
    this.firstAddresses.push(ref);
    console.log("New device address", addresses[i], "starts at ", ref.toString(16));
    ref+=capacities[i];
    this.lastAddresses.push(ref);
  }
}

MultiChipEEPROM.prototype.getAddress=function(eeaddress) {
  var i, j, x, pos, i2c;
  j=this.devices.length;
  x=-1;
  for(i=0; i<j; i++) {
    if(eeaddress<this.lastAddresses[i]) {
      x=i;
      pos=eeaddress-this.firstAddresses[i];
      i2c=this.devices[x];
      i=j;
    }
  }
  return [x, pos];
}

MultiChipEEPROM.prototype.write_byte=function(eeaddress, data, next) {
  var ret=getAddress(eeaddress);
  var x=ret[0];
  if(x==-1) return;
  var pos=ret[1];
  this.i2c_eeprom_write_byte(i2c, pos, data, next);
}
MultiChipEEPROM.prototype.i2c_eeprom_write_byte=function(i2c, eeaddress, data, next) {
  var buf=new Buffer(3);
  buf.writeUInt8(eeaddress>>8, 0);
  buf.writeUInt8(eeaddress & 0xFF, 1);
  buf.writeUInt8(data, 2);
  i2c.send(buf, next(err))
}


MultiChipEEPROM.prototype.write_buffer=function(eeaddress, data, next) {
  var ret=getAddress(eeaddress);
  var x=ret[0];
  if(x==-1) return;
  var pos=ret[1];
  this.i2c_eeprom_write_buffer(i2c, pos, data, next);
}
MultiChipEEPROM.prototype.i2c_eeprom_write_buffer=function(i2c, eeaddress, data, next) {
  var i, j;
  j=data.length;
  var buf=new Buffer(j+2);
  buf.writeUInt8(eeaddress>>8, 0);
  buf.writeUInt8(eeaddress & 0xFF, 1);
  for(i=0;i<j;i++) {
    buf.writeUInt8(data[i], i+2);
  }
  i2c.send(buf, next(err))
}


MultiChipEEPROM.prototype.read_byte=function(eeaddress, next) {
  var ret=this.getAddress(eeaddress);
  var x=ret[0];
  var pos=ret[1];
  if(x==-1) return false;
  this.i2c_eeprom_read_byte(this.devices[x], pos, next);
}
MultiChipEEPROM.prototype.i2c_eeprom_read_byte=function(i2c, eeaddress, next) {
  var buf=new Buffer(2);
  buf.writeUInt8(eeaddress>>8, 0);
  buf.writeUInt8(eeaddress & 0xFF, 1);
  i2c.transfer(
    buf,
    1,
    next
  );
}


MultiChipEEPROM.prototype.read_buffer=function(eeaddress, len, next) {
  var ret=this.getAddress(eeaddress);
  var x=ret[0];
  var pos=ret[1];
  if(x==-1) return false;
  this.i2c_eeprom_read_buffer(this.devices[x], pos, len, next);
}
MultiChipEEPROM.prototype.i2c_eeprom_read_buffer=function(i2c, eeaddress, len, next) {
  var buf=new Buffer(2);
  buf.writeUInt8(eeaddress>>8, 0);
  buf.writeUInt8(eeaddress & 0xFF, 1);
  i2c.transfer(
    buf,
    len,
    next
  );
}

var MCE=new MultiChipEEPROM('A', [0x50, 0x51], [atmel24C512, atmel24C512]);
function output16bHex(a) {
  var x="";
  if(a<16) x="0";
  x=x+a.toString(16);
  return x;
}

var x=0, y=0;

var output="00: ";
MCE.read_byte(0, keepGoing);
// i2c_eeprom_read_buffer(0, 16, keepGoing2);

function keepGoing(err, rx) {
  output=output+output16bHex(rx.readUInt8(0))+" ";
  y=y+1;
  if(y==16) {
    x=x+1;
    y=0;
    console.log(output);
    if(x==4) return;
    output=output16bHex(x*16)+": ";
  }
  MCE.read_byte(x*16+y, keepGoing);
}

function keepGoing2(err, rx) {
  for(y=0; y<16; y++) {
    output=output+output16bHex(rx.readUInt8(y))+" ";
  }
  console.log(output);
  x=x+1;
  if(x==4) return;
  output=output16bHex(x*16)+": ";
  i2c_eeprom_read_buffer(x*16, 16, keepGoing2);
}

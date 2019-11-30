const swc = require("../../lib/");
const Visitor = require("../../lib/Visitor").default;

{
  const src = `
  'use strict';
  
  class Foo {
    foo() {}
  }
  
  class Bar extends Foo {
    foo() {
      super.foo();
    }
    async bar() {}
  }
  
  class Baz extends Bar {
    foo() {
      super.foo();
      this.baz()
    }
    baz() {
  
    }
    async other() {
      this.baz()
      await super.bar()
    }
  }
  
  function red( color )
  {
      let foo = 3.14;
      return color >> 16;
  }
  
  function green( color )
  {
      return ( color >> 8 ) & 0xFF;
  }
  
  /**
   * Extract blue color out of a color integer:
   *
   * 0x00DEAD -> 0xAD
   *
   * @param  {Number} color
   * @return {Number}
   */
  function blue( color )
  {
      return color & 0xFF;
  }
  
  function intToHex( int )
  {
      const mask = '#000000';
  
      const hex = int.toString( 16 );
  
      return mask.substring( 0, 7 - hex.length ) + hex;
  }
   
  function hexToInt( hex )
  {
      return parseInt( hex.substring( 1 ), 16 );
  }
  
  module.exports = {
      red,
      green,
      blue,
      intToHex,
      hexToInt,
  };
  `;

  it("works", () => {
    swc.transformSync(src, {
      plugin: m => m
    });
  });

  it("works with visitor", () => {
    const src = `'use strict';
  
class Bar extends Foo {
  foo() {
    super.foo();
  }
}




`;

    swc.transformSync(src, {
      plugin: m => {
        let v = new Visitor();
        console.log(
          JSON.stringify(m.body[1].body[0].function.body.stmts[0].callee)
        );
        const mod = v.visitModule(m);
        console.log(
          JSON.stringify(mod.body[1].body[0].function.body.stmts[0].callee)
        );
        return mod;
      }
    });
  });
}

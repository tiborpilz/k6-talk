import{aj as x,_ as C,as as $,at as V}from"../index-gmbjoFpx.js";import{d as b,a7 as z,ay as B,F as I,o as w,c as G,aA as M,v as o,aB as h,aC as D,l as F,ad as j}from"../modules/vue-BKchfzx3.js";import{u as E}from"./context-So-pL088.js";const L=b({__name:"VClickGap",props:{size:{type:[String,Number],default:1}},setup(d,{expose:a}){a();const i=d,{$clicksContext:l}=E(),c=x();let n=+i.size;Number.isNaN(n)&&(console.warn(`[slidev] Invalid size for VClickGap: ${i.size}`),n=1),z(()=>{const u=l.currentOffset+n-1;l.register(c,{max:u,delta:n})}),B(()=>{l.unregister(c)});const t={props:i,clicks:l,id:c,get delta(){return n},set delta(u){n=u},Fragment:I};return Object.defineProperty(t,"__isScriptSetup",{enumerable:!1,value:!0}),t}});function O(d,a,i,l,c,n){return w(),G(l.Fragment)}const T=C(L,[["render",O],["__file","/home/runner/work/k6-talk/k6-talk/node_modules/@slidev/client/builtin/VClickGap.vue"]]),N=["ul","ol"],q=b({props:{depth:{type:[Number,String],default:1},every:{type:[Number,String],default:1},at:{type:[Number,String],default:"+1"},hide:{type:Boolean,default:!1},fade:{type:Boolean,default:!1},handleSpecialElements:{type:Boolean,default:!0}},render(){var g,A;const d=+this.every,a=$(this.at),i=typeof a=="string";if(!a){console.warn("[slidev] Invalid at prop for v-clicks component:",a);return}const l=M("click"),c=(s,e)=>j(s,[[l,e,"",{hide:this.hide,fade:this.fade}]]),n=s=>s.flatMap(e=>h(e)&&typeof e.type=="symbol"&&Array.isArray(e.children)?n(e.children):[e]);let t=(A=(g=this.$slots).default)==null?void 0:A.call(g);if(!t)return;t=n(V(t));const u=(s,e=1)=>n(s).map(r=>{if(!h(r))return r;if(N.includes(r.type)&&Array.isArray(r.children)){const p=f(r.children,e+1);return o(r,{},p)}return o(r)});let k=1,m=0;const f=(s,e=1)=>n(s).map(r=>{if(!h(r)||r.type===D)return r;const p=+a+Math.ceil(k++/d)-1;let _;e<+this.depth&&Array.isArray(r.children)?_=o(r,{},u(r.children,e)):_=o(r);const v=p-m;return m=p,c(_,i?v>=0?`+${v}`:`${v}`:p)}),y=()=>F(T,{size:+a+Math.ceil((k-1)/d)-1-m});if(this.handleSpecialElements){if(t.length===1&&N.includes(t[0].type)&&Array.isArray(t[0].children))return o(t[0],{},[...f(t[0].children),y()]);if(t.length===1&&t[0].type==="table"){const s=t[0];if(Array.isArray(s.children))return o(s,{},s.children.map(e=>h(e)?e.type==="tbody"&&Array.isArray(e.children)?o(e,{},[...f(e.children),y()]):o(e):e))}}return[...f(t),y()]}});export{q as _};
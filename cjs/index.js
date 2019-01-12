'use strict';
const tta = (m => m.__esModule ? m.default : m)(require('@ungap/template-tag-arguments'));
const {Wire, isArray} = require('./shared.js');
const Tagger = (m => m.__esModule ? m.default : m)(require('./tagger.js'));

const wm = new WeakMap;

let current = null;

function render(node, callback) {
  const prev = current;
  current = wm.get(node) || set(node);

  // TODO: perf measurement about guarding this via try/catch/finally
  const result = callback();

  switch (result.constructor) {
    case Template:
      const template = result._[0];
      const diff = current.template !== template;
      if (diff && current.template)
        current.stack.splice(0);
      current.i = 0;
      if (diff) {
        current.template = template;
        appendChild(node, result.valueOf(true));
      }
      break;
    case Wire:
      if (node.firstChild !== result.firstChild)
        appendChild(node, result.valueOf(true));
      break;
    default:
      appendChild(node, result);
      break;
  }

  current = prev;
  return node;
}
exports.render = render

const html = outer('html');
exports.html = html;
const svg = outer('svg');
exports.svg = svg;

// the Template class
function Template($, _) {
  this.$ = $;
  this._ = _;
}

const TP = Template.prototype;

// used to avoid bad checks round
TP.nodeType = 0;

// used to force rended into wire/node
TP.valueOf = function () {
  return unroll(this);
};

function appendChild(node, fragment) {
  node.textContent = '';
  node.appendChild(fragment);
}

function getWire(type, args) {
  const {i, stack} = current;
  current.i++;
  // TODO:  a conditional SVG instead of HTML will cause
  //        surely problems, even if extremely edge case.
  //        Remember to explain this is a current caveat.
  if (i === stack.length) {
    const tagger = new Tagger(type);
    const wire = wireContent(tagger.apply(null, args));
    stack.push({tagger, wire});
    return wire;
  } else {
    const {tagger, wire} = stack[i];
    tagger.apply(null, args);
    return wire;
  }
}

function outer(type) {
  return function () {
    const $ = tta.apply(null, arguments);
    return current ? new Template(type, $) : new Tagger(type).apply(null, $);
  };
}

function set(node) {
  const info = {i: 0, stack: [], template: null};
  wm.set(node, info);
  return info;
}

function unroll(template) {
  const {$, _} = template;
  const {length} = _;
  for (let i = 1; i < length; i++)
    unrollDeep(_[i], i, _);
  return getWire($, _);
}

function unrollDeep(value, i, array) {
  if (value) {
    if (value.constructor === Template)
      array[i] = unroll(value);
    else if (isArray(value))
      value.forEach(unrollDeep);
  }
}

function wireContent(node) {
  const childNodes = node.childNodes;
  const {length} = childNodes;
  return length === 1 ?
    childNodes[0] :
    (length ? new Wire(childNodes) : node);
}

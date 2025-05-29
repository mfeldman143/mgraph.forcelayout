// test/vue-integration.test.js
import { test, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import createLayout from '../index.js';
import createGraph from 'mgraph.graph';

test('createLayout works inside a Vue 3 component', () => {
  const Test = defineComponent({
    setup() {
      const graph  = createGraph();
      graph.addNode(1);
      const layout = createLayout(graph);
      return { layout };
    },
    render() { return h('div', `layout ready: ${!!this.layout}`); }
  });

  const wrapper = mount(Test);
  expect(wrapper.text()).toBe('layout ready: true');
  expect(typeof wrapper.vm.layout.step).toBe('function');
});

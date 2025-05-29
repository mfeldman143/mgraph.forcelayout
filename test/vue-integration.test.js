// test/vue-integration.test.js
import { test, expect } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import createLayout from '../index.js';
import createGraph from 'mgraph.graph'; // Import createGraph

test('mgraph.forcelayout can be used within a Vue component', async () => {
  const TestComponent = defineComponent({
    setup() {
      const graph = createGraph(); // Create a mock graph
      const layout = createLayout(graph); // Pass the graph to createLayout
      return { layout };
    },
    render() {
      return h('div', `Layout created: ${!!this.layout}`);
    },
  });

  const wrapper = mount(TestComponent);

  expect(wrapper.text()).toBe('Layout created: true');
  expect(typeof wrapper.vm.layout.step).toBe('function'); // Check a method from the layout
});

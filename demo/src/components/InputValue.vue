<template>
<div class='block'>
  <div class='row'>
    <div class='col'>{{label}}</div>
    <div class='col'>
      <input type='number'
         :step='step'
         :value='modelValue'
         @input='updateValue'
         @focus="selectAll"
        autocomplete="off"
         autocorrect="off"
         autocapitalize="off"
         spellcheck="false">
    </div>
    <help-icon @show='helpVisible = !helpVisible' :class='{open: helpVisible}'></help-icon>
  </div>
  <div class='row help' v-if='helpVisible'>
    <slot></slot>
  </div>
</div>
</template>

<script>
import HelpIcon from './HelpIcon.vue';

export default {
  components: {
    HelpIcon
  },
  props: {
    label: String,
    modelValue: Number,  // Changed from 'value' to 'modelValue'
    step: {
      default: '0.1',
      type: String
    },
  },
  emits: ['update:modelValue'],  // Added emits declaration
  methods: {
    selectAll(e) {
      e.target.select()
    },
    updateValue(e) {
      this.$emit('update:modelValue', parseFloat(e.target.value));  // Changed from 'input' to 'update:modelValue'
    }
  },
  data() {
    return {
      helpVisible: false,
    }
  }
}
</script>

<style lang="stylus">
primary-text = white;
help-background = #004499;

.block {
  .row {
    display: flex;
    flex-direction: row;
    margin-top: 1px;
  }
  .col {
    flex: 1;
  }
  a.help-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    width: 25px;
    margin-right: -7px;
    svg {
      fill: secondary-text;
    }
    &.open {
      background: help-background;
      svg {
        fill: primary-text;
      }
    }
  }
  .row.help {
    margin-top: 0;
    background: help-background;
    padding: 8px;
    margin: 0 -7px;
  }
  input[type='text'],
  input[type='number'] {
    background: transparent;
    color: primary-text;
    border: 1px solid transparent;
    padding: 7px;
    font-size: 16px;
    width: 100%;
    margin-left: 7px;
    &:focus {
      outline-offset: 0;
      outline: none;
      border: 1px dashed;
      background: #13294f;
    }
    &:invalid {
      box-shadow:none;
    }
  }
}
</style>
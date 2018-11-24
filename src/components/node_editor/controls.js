import Rete from 'rete';

const NumControlComponent = {
    props: ['emitter', 'vkey', 'readonly', 'getData', 'putData'],
    template: '<input type="number" :value="value" :readonly="readonly" @input="onChange($event)" />',
    data() {
        return {
            value: 0,
        };
    },
    methods: {
        onChange(event) {
            this.value = +event.target.value;
            console.log(`set value to ${this.value} (${typeof this.value})`);
            this.update();
        },
        update() {
            if (this.vkey) {
                console.log(`NumControlComponent putData key: ${this.vkey} value: ${this.value} type: ${typeof this.value}`);
                this.putData(this.vkey, this.value);
            }
            console.log('NumControlComponent triggering process');
            this.emitter.trigger('process');
        },
    },
    mounted() {
        console.log('NumControlComponent mounted');
        console.log(this);
        this.value = this.getData(this.vkey);
        console.log(`mounted set value for key ${this.vkey} to ${this.value}`);
    },
};

class NumControl extends Rete.Control {
    constructor(emitter, key, readonly = false) {
        super(key);
        this.render = 'vue';
        this.component = NumControlComponent;
        this.props = { emitter, vkey: key, readonly };
    }

    setValue(val) {
        console.log(`NumControl setValue to ${val}`);
        this.vueContext.value = val;
    }
}

export default { NumControl };

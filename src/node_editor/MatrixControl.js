import Rete from 'rete';
import MatrixControlView from './MatrixControlView.vue';

export class MatrixControl extends Rete.Control {
    constructor(emitter, key, rowIdx) {
        console.log('MatrixControl constrtuctor');
        super(key);
        this.render = 'vue';
        this.component = MatrixControlView;
        this.props = { emitter, vkey: key, rowIdx };
    }

    setValue(val) {
        console.log(`MatrixControl setValue to ${val} (from ${this.vueContext.value})`);
        // TODO Setting all values at once has a few bugs (e.g. change the value of one cell, then connect a different matrix as input;
        //      the updated axis won't change to the new value).  I think it has something to do with how Vue handles reactivity of objects.
        // TODO I haven't actually tested if the above is true for matrix, but it was true for vector
        // this.vueContext.value = val;
        for (const i of Array(4).keys()) {
            for (const j of Array(4).keys()) {
                this.vueContext.value[i][j] = val[i][j];
            }
        }
    }

    setReadOnly(readOnly) {
        console.log(`MatrixControl setReadOnly ${readOnly}`);
        this.vueContext.readOnly = readOnly;
    }
};

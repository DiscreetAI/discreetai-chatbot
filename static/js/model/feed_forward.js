// var tf = require('@tensorflow/tfjs-node');
// var assert = require('assert');
// var biasAdd = require('./utils').biasAdd;

import {biasAdd, dot, gelu} from './utils.js';

export class FeedForward extends tf.layers.Layer {

    constructor(units, activation=gelu, useBias=true, kernelInitializer=tf.initializers.glorotNormal(),
    biasInitializer=tf.initializers.zeros(), kernelConstraint=null, biasRegularizer=null, biasConstraint=null, 
    dropoutRate=0.0, ...args) {

        if (typeof units == 'object') {
            var config = units;
            units = config.units;
            super({trainable:config.trainable, name:config.name});
        } else {
            super(...args);
        }

        this.supportsMasking = true;
        this.units = units;
        this.activation = activation;
        this.useBias = useBias;
        this.kernelInitializer = kernelInitializer;
        this.biasConstraint = biasConstraint;
        this.biasInitializer = biasInitializer;
        this.kernelConstraint = kernelConstraint;
        this.biasRegularizer = biasRegularizer;
        this.dropoutRate = dropoutRate;

        this.W1 = null;
        this.b1 = null;
        this.W2 = null;
        this.b2 = null;
    }

    getConfig() {
        var baseConfig = super.getConfig();
        baseConfig['units'] = this.units;
        baseConfig['activation'] = this.relu,
        baseConfig['useBias'] = this.useBias;
        baseConfig['kernelInitializer'] = this.kernelInitializer;
        baseConfig['biasInitializer'] = this.biasInitializer;
        baseConfig['kernelConstraint'] = this.kernelConstraint;
        baseConfig['biasConstraint'] = this.biasConstraint;
        baseConfig['biasRegularizer'] = this.biasRegularizer;
        return baseConfig;
    }

    computeOutputShape(inputShape) {
        return inputShape;
    }

    computeMask(inputMask=null) {
        return inputMask;
    }

    build(inputShape) {
        var featureDim = parseInt(inputShape[inputShape.length - 1]);

        this.W1 = this.addWeight(
            this.name.concat('_W1'),
            [featureDim, this.units],
            undefined,
            this.kernelInitializer
        );
        if (this.useBias) {
            this.b1 = this.addWeight(
                this.name.concat('_b1'),
                [this.units],
                undefined,
                this.biasInitializer
            )
        }

        this.W2 = this.addWeight(
            this.name.concat('_W2'),
            [this.units, featureDim],
            undefined,
            this.kernelInitializer
        );
        if (this.useBias) {
            this.b2 = this.addWeight(
                this.name.concat('_b2'),
                [featureDim],
                undefined,
                this.biasInitializer
            )
        }

        super.build(inputShape);
    }

    dot(x, y) {
        var newArr = [];
        x = x.arraySync();
        y = y.arraySync();
        for (var i = 0; i < x.length; i++) {
            newArr.push(tf.dot(x[i], y).arraySync());
        }
        var newTensor = tf.tensor(newArr)
        ////console.log("FINISHED");
        return newTensor;
    }

    call(x, mask=null, training=null) {
        //console.log("x", x[0].arraySync());
        x = x[0];
        ////console.log(this.W1.val.shape)
        var h = dot(x, this.W1.val);
        ////console.log(h.shape);

        if (this.useBias) {
            //console.log("hey", h.shape, this.b1.val.shape);
            // assert(false);
            h = biasAdd(h, this.b1.val);
        }
    
        //console.log("w2", this.W2.val.arraySync());
        //console.log("b2", this.b2.val.arraySync())
        if (this.activation != null) {
            h = this.activation(h);
        }
        //console.log("h", h.arraySync());
        if (0.0 < this.dropoutRate < 1.0) {
            function droppedInputs() {
                return tf.dropout(h, this.dropoutRate, h.shape);
            }
        }

        var y = dot(h, this.W2.val);

        if (this.useBias) {
            ////console.log("hey", y.shape, this.b2.val.shape);
            y = biasAdd(y, this.b2.val);
        }
        //return tf.initializers.ones().apply([2, 1024, 768]);
        //console.log("y", y.arraySync());
        return y;

    }

    static get className() {
        return 'FeedForward';
    }
}
tf.serialization.registerClass(FeedForward)
// module.exports = {
//     FeedForward:FeedForward
// }
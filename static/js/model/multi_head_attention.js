// var tf = require('@tensorflow/tfjs-node');
// var ScaledDotProductAttention = require('./scaled_dot_product_attention').ScaledDotProductAttention;
// var assert = require('assert');
import {ScaledDotProductAttention} from './scaled_dot_product_attention.js';
import {dot} from './utils.js';

export class MultiHeadAttention extends tf.layers.Layer {
    constructor(headNum, activation=tf.relu, historyOnly=false, useBias=true, kernelInitializer=tf.initializers.glorotNormal(),
        biasInitializer=tf.initializers.zeros(), kernelConstraint=null, biasRegularizer=null, biasConstraint=null, ...args){

        if (typeof headNum == 'object') {
            var config = headNum;
            headNum = config.headNum;
            activation = null;
            historyOnly=true;
            super({trainable:config.trainable, name:config.name});
        } else {
            super(...args);
        }

        this.supportsMasking = true;
        this.headNum = headNum;
        this.activation = activation;
        this.historyOnly = historyOnly;
        this.useBias = useBias;
        this.kernelInitializer = kernelInitializer;
        this.biasConstraint = biasConstraint;
        this.biasInitializer = biasInitializer;
        this.kernelConstraint = kernelConstraint;
        this.biasRegularizer = biasRegularizer;

        this.Wq = null;
        this.Wk = null;
        this.Wv = null;
        this.Wo = null;
        this.bq = null;
        this.bk = null;
        this.bv = null;
        this.bo = null;
    }

    getConfig() {
        var baseConfig = super.getConfig();
        baseConfig['headNum'] = this.headNum;
        baseConfig['activation'] = this.relu,
        baseConfig['historyOnly'] = false;
        baseConfig['useBias'] = true;
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

    computeMask(inputs, inputMask=null) {
        return inputMask;
    }

    build(inputShape) {
        var q, k, v;
        q = k = v = inputShape;

        //console.log(inputShape)
        //console.log(q, k, v)
        var featureDim = v[v.length - 1];

        //console.log(featureDim, this.headNum);
        console.assert (featureDim % this.headNum == 0);

        this.Wq = this.addWeight(
            this.name.concat('_Wq'),
            [q[q.length - 1], featureDim],
            undefined,
            this.kernelInitializer,
        );

        if (this.useBias) {
            this.bq = this.addWeight(
                this.name.concat('_bq'),
                [featureDim],
                undefined,
                this.biasInitializer,
            );
        }

        this.Wk = this.addWeight(
            this.name.concat('_Wk'),
            [k[k.length - 1], featureDim],
            undefined,
            this.kernelInitializer,
        );

        if (this.useBias) {
            this.bk = this.addWeight(
                this.name.concat('_bk'),
                [featureDim],
                undefined,
                this.biasInitializer,
            );
        }

        this.Wv = this.addWeight(
            this.name.concat('_Wv'),
            [v[v.length - 1], featureDim],
            undefined,
            this.kernelInitializer,
        );

        if (this.useBias) {
            this.bv = this.addWeight(
                this.name.concat('_bv'),
                [featureDim],
                undefined,
                this.biasInitializer,
            );
        }

        this.Wo = this.addWeight(
            this.name.concat('_Wo'),
            [featureDim, featureDim],
            undefined,
            this.kernelInitializer,
        );

        if (this.useBias) {
            this.bo = this.addWeight(
                this.name.concat('_bo'),
                [featureDim],
                undefined,
                this.biasInitializer,
            );
        }
        super.build(inputShape);
    }

    reshapeToBatches(x, headNum) {
        //console.log(x)
        var inputShape = x.shape;
        var batchSize = inputShape[0];
        var seqLen = inputShape[1];
        var featureDim = inputShape[2];

        //console.log(inputShape, "START")
        var headDim = Math.floor(featureDim/headNum);
        x = tf.reshape(x, [batchSize, seqLen, headNum, headDim]);
        x = tf.transpose(x, [0, 2, 1, 3]);
        return tf.reshape(x, [batchSize*headNum, seqLen, headDim]);
    }

    reshapeFromBatches(x, headNum) {
        var inputShape = x.shape;
        var batchSize = inputShape[0];
        var seqLen = inputShape[1];
        var featureDim = inputShape[2];

        //console.log(batchSize, seqLen, featureDim, headNum, "FINISH")
        x = tf.reshape(x, [Math.floor(batchSize/headNum), headNum, seqLen, featureDim]);
        x = tf.transpose(x, [0, 2, 1, 3]);
        return tf.reshape(x, [Math.floor(batchSize/headNum), seqLen, featureDim*headNum]);
    }

    reshapeMask(mask, headNum) {
        if (mask == null) {
            return mask;
        }
        var seqLen = mask.shape[1];
        mask = tf.expandDims(mask, 1);
        mask = tf.tile(mask, [1, headNum, 1]);
        return tf.reshape(mask, [mask.size/seqLen, seqLen]);
    }

    call(inputs, mask=null) {
        //console.log(inputs)
        //console.log(inputs[0].arraySync())
        var q, k, v;
        q = k = v = inputs[0];

        //console.log("mask", mask)
        var q_mask, k_mask, v_mask;
        q_mask = k_mask = v_mask = null;

        //console.log("first q", q);
        //console.log(this.Wq, "thisWq")
        //console.log(q)
        //console.log("Q", q.shape);
        //console.log("WQ", this.Wq.val.shape);
        //console.log(dot(q, this.Wq.val))
        q = dot(q, this.Wq.val);
        k = dot(k, this.Wk.val);
        v = dot(v, this.Wv.val);
        
        if (this.useBias) {
            q = tf.add(q, this.bq.val);
            k = tf.add(k, this.bk.val);
            v = tf.add(v, this.bv.val);
        }

        if (this.activation != null) {
            q = this.activation(q);
            k = this.activation(k);
            v = this.activation(v);
        }

        //console.log("second q, Wq", q.arraySync());
        //console.log(q, "q");
        var y = new ScaledDotProductAttention(
            undefined,
            this.historyOnly,
            {name:this.name.concat('-Attention')}
        ).apply(
            [this.reshapeToBatches(q, this.headNum), this.reshapeToBatches(k, this.headNum), this.reshapeToBatches(v, this.headNum)],
            {mask: [this.reshapeMask(q_mask, this.headNum), this.reshapeMask(k_mask, this.headNum), this.reshapeMask(v_mask, this.headNum) ]}
        );

        
        y = this.reshapeFromBatches(y, this.headNum);
        y = dot(y, this.Wo.val);

        if (this.useBias) {
            y = tf.add(y, this.bo.val);
        }

        if (this.activation != null) {
            y = this.activation(y);
        }

        //console.log(y)

        var outputShape = q.shape.slice(0, q.shape.length - 1).concat([v.shape[v.shape.length - 1]]);
        
        //console.log(outputShape)

        if (outputShape[1] != null) {
            var size = y.size;
            for (var i = 1; i < outputShape.length; i++) {
                size /= outputShape[i];
            }
            outputShape = [size].concat(outputShape.slice(1));
            y = tf.reshape(y, outputShape);
        }

        //console.log("ATTENTION", y);
        return y;

    }

    static get className() {
        return 'MultiHeadAttention';
    }
}

tf.serialization.registerClass(MultiHeadAttention)

// module.exports = {
//     MultiHeadAttention: MultiHeadAttention
// }
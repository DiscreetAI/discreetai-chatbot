import {range, swap, strip, arraysEqual} from './model/utils.js';

/*
ENCODER
- Encodes preprocessed text so that it can be directly fed into language model
- Decodes output from language model into text to be postprocessed
*/

class Encoder {
    constructor(token_dict, bpe_rank) {
        this.token_dict = token_dict;
        this.token_dict_inv = swap(token_dict);
        this.bpe_rank = bpe_rank;
        this.byte_encoder = init_byte_encoder()
        this.byte_decoder = swap(this.byte_encoder);
        this.cache = {};

        this.token_pattern = /\w+|[;.,!?:]|\'\w+/g
    }

    bpe(token) {
        if (token in this.cache) {
            return this.cache[token];
        }

        var chars = token.split("");
        var bpe_rank = this.bpe_rank;
        while (chars.length > 0) {
            var min_pair = null;
            var min_rank = Infinity;

            var range_arr = range(1, chars.length);

            range_arr.forEach(i => {
                var pair = [chars[i - 1], chars[i]];
                var rank = bpe_rank[pair] || Infinity;
                if (rank < min_rank) {
                    min_rank = rank;
                    min_pair = pair;
                }
            });

            if (min_pair == null || !(min_pair in bpe_rank)) {
                break;
            }

            var last = chars[0];
            var tail = 1;

            range_arr.forEach(index => {
                if (arraysEqual([last, chars[index]], min_pair)) {
                    chars[tail - 1] = last + chars[index];
                    last = last + chars[index];
                } else {
                    chars[tail - 1] = last;
                    tail++;
                    last = chars[index];
                }
            });
            chars[tail - 1] = last;
            chars = chars.slice(0, tail);
        }
        
        chars = [chars.join('')]
        this.cache[token] = chars;
        return chars;
    }  

    encode(text) {
        var bpe_tokens = [];
        var byte_encoder = this.byte_encoder;
        
        var token_dict = this.token_dict;
        var num = 0;
        var temp = [];
        text = text.trim()
        temp = text.split(' ');
        temp.forEach(text => {
            var i = 0;
            var matchArr = text.match(this.token_pattern);
            matchArr.forEach(token => {
                if (num != 0 && i == 0) {
                    token = ' ' + token;
                }
                token = this.encode_utf8(token).split('').map(function(char) {
                    return byte_encoder[char.charCodeAt(0)];
                }).join('');
                bpe_tokens = bpe_tokens.concat(this.bpe(token).map(token=> {
                    return token_dict[token];
                }));
                num += 1;
                i++;
            })
            i = 0;
        })
        
        return bpe_tokens;
    }

    encode_utf8(s) {
        return unescape(encodeURIComponent(s));
    }
      
    decode_utf8(s) {
        return decodeURIComponent(escape(s));
    }

    decode(tokens) {
        var token_dict_inv = this.token_dict_inv
        var byte_decoder = this.byte_decoder
        var text = tokens.map(token => {
            return token_dict_inv[token];
        }).join('');

        text = text.split('').map(byte => {
            return String.fromCharCode(byte_decoder[byte]);
        }).join('');
        
        return this.decode_utf8(text);
    }

    load_dataset(text) {
        var token_chunks = [];
        if (text.length <= 50000) {
            text = text.concat('<|endoftext|>');
        }
        token_chunks.push(this.encode(text));
        return token_chunks;
    }
}

export async function get_encoder() {
    var encoder_json = await fetch('encoder.json');
    encoder_json = await encoder_json.json();
    var vocab_bpe = await fetch('vocab.bpe');
    vocab_bpe = await vocab_bpe.text();
    var bpe_rank = {}
    var temp_arr = vocab_bpe.split('\n')
    for (var i = 0; i < temp_arr.length; i++) {
        var line = temp_arr[i];
        line = strip(line);
        if (line.length > 0) {

        }
        bpe_rank[line.split()] = i;
    }
    return new Encoder(encoder_json, bpe_rank);
}
    
function init_byte_encoder() {
    var codes = range("!".charCodeAt(0), "~".charCodeAt(0) + 1).concat(range("¡".charCodeAt(0), "¬".charCodeAt(0) + 1), range("®".charCodeAt(0), "ÿ".charCodeAt(0) + 1));

    var byte_encoder = {};
    codes.forEach(code => {
        byte_encoder[code] = String.fromCharCode(code);
    });
    
    var shift = 0
    for (var code = 0; code < 256; code++) {
        if (!(code in byte_encoder)){
            byte_encoder[code] = String.fromCharCode(256 + shift)[0];
            shift += 1
        } 
    }
    
    return byte_encoder;
}


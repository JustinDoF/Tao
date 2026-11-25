/* ==========================================================
   meihua-data.js — 梅花易数 卦象数据
   八卦（先天数 1–8）+ 六十四卦（上下卦组合）
   爻由下而上：索引 0 = 初爻，1 = 阳
   ========================================================== */
(function (global) {
  'use strict';

  var TRIGRAMS = [
    { key: 'qian', name: '乾', symbol: '☰', num: 1, nature: '天', wuxing: '金',
      attr: '健', family: '父', dir: '西北', animal: '马',
      lines: [1, 1, 1], xiang: '刚健不息，自强之象' },
    { key: 'dui', name: '兑', symbol: '☱', num: 2, nature: '泽', wuxing: '金',
      attr: '悦', family: '少女', dir: '西', animal: '羊',
      lines: [1, 1, 0], xiang: '和悦相通，口舌之象' },
    { key: 'li', name: '离', symbol: '☲', num: 3, nature: '火', wuxing: '火',
      attr: '丽', family: '中女', dir: '南', animal: '雉',
      lines: [1, 0, 1], xiang: '光明附丽，文明之象' },
    { key: 'zhen', name: '震', symbol: '☳', num: 4, nature: '雷', wuxing: '木',
      attr: '动', family: '长男', dir: '东', animal: '龙',
      lines: [1, 0, 0], xiang: '奋动振起，惊惧之象' },
    { key: 'xun', name: '巽', symbol: '☴', num: 5, nature: '风', wuxing: '木',
      attr: '入', family: '长女', dir: '东南', animal: '鸡',
      lines: [0, 1, 1], xiang: '顺入无碍，风行草偃' },
    { key: 'kan', name: '坎', symbol: '☵', num: 6, nature: '水', wuxing: '水',
      attr: '陷', family: '中男', dir: '北', animal: '豕',
      lines: [0, 1, 0], xiang: '险陷流行，劳苦之象' },
    { key: 'gen', name: '艮', symbol: '☶', num: 7, nature: '山', wuxing: '土',
      attr: '止', family: '少男', dir: '东北', animal: '狗',
      lines: [0, 0, 1], xiang: '静止笃实，阻隔之象' },
    { key: 'kun', name: '坤', symbol: '☷', num: 8, nature: '地', wuxing: '土',
      attr: '顺', family: '母', dir: '西南', animal: '牛',
      lines: [0, 0, 0], xiang: '柔顺承载，厚德之象' }
  ];

  var BY_NUM = {};
  var BY_KEY = {};
  TRIGRAMS.forEach(function (t) { BY_NUM[t.num] = t; BY_KEY[t.key] = t; });

  /* 六十四卦：按《周易》通行卦序
     up = 上卦（外卦），low = 下卦（内卦）
     卦辞取通行本；fortune 为总体吉凶倾向（用于配色，非断卦依据） */
  var HEXAGRAMS = [
    { n: 1,  up: 'qian', low: 'qian', name: '乾为天',   short: '乾',  duan: '元亨利贞。', fortune: '吉' },
    { n: 2,  up: 'kun',  low: 'kun',  name: '坤为地',   short: '坤',  duan: '元亨，利牝马之贞。君子有攸往，先迷后得主，利。', fortune: '吉' },
    { n: 3,  up: 'kan',  low: 'zhen', name: '水雷屯',   short: '屯',  duan: '元亨利贞。勿用有攸往，利建侯。', fortune: '凶' },
    { n: 4,  up: 'gen',  low: 'kan',  name: '山水蒙',   short: '蒙',  duan: '亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。', fortune: '平' },
    { n: 5,  up: 'kan',  low: 'qian', name: '水天需',   short: '需',  duan: '有孚，光亨，贞吉。利涉大川。', fortune: '吉' },
    { n: 6,  up: 'qian', low: 'kan',  name: '天水讼',   short: '讼',  duan: '有孚窒惕，中吉，终凶。利见大人，不利涉大川。', fortune: '凶' },
    { n: 7,  up: 'kun',  low: 'kan',  name: '地水师',   short: '师',  duan: '贞，丈人吉，无咎。', fortune: '平' },
    { n: 8,  up: 'kan',  low: 'kun',  name: '水地比',   short: '比',  duan: '吉。原筮元永贞，无咎。不宁方来，后夫凶。', fortune: '吉' },
    { n: 9,  up: 'xun',  low: 'qian', name: '风天小畜', short: '小畜', duan: '亨。密云不雨，自我西郊。', fortune: '平' },
    { n: 10, up: 'qian', low: 'dui',  name: '天泽履',   short: '履',  duan: '履虎尾，不咥人，亨。', fortune: '平' },
    { n: 11, up: 'kun',  low: 'qian', name: '地天泰',   short: '泰',  duan: '小往大来，吉亨。', fortune: '吉' },
    { n: 12, up: 'qian', low: 'kun',  name: '天地否',   short: '否',  duan: '否之匪人，不利君子贞，大往小来。', fortune: '凶' },
    { n: 13, up: 'qian', low: 'li',   name: '天火同人', short: '同人', duan: '同人于野，亨。利涉大川，利君子贞。', fortune: '吉' },
    { n: 14, up: 'li',   low: 'qian', name: '火天大有', short: '大有', duan: '元亨。', fortune: '吉' },
    { n: 15, up: 'kun',  low: 'gen',  name: '地山谦',   short: '谦',  duan: '亨，君子有终。', fortune: '吉' },
    { n: 16, up: 'zhen', low: 'kun',  name: '雷地豫',   short: '豫',  duan: '利建侯行师。', fortune: '吉' },
    { n: 17, up: 'dui',  low: 'zhen', name: '泽雷随',   short: '随',  duan: '元亨利贞，无咎。', fortune: '吉' },
    { n: 18, up: 'gen',  low: 'xun',  name: '山风蛊',   short: '蛊',  duan: '元亨，利涉大川。先甲三日，后甲三日。', fortune: '凶' },
    { n: 19, up: 'kun',  low: 'dui',  name: '地泽临',   short: '临',  duan: '元亨利贞。至于八月有凶。', fortune: '吉' },
    { n: 20, up: 'xun',  low: 'kun',  name: '风地观',   short: '观',  duan: '盥而不荐，有孚颙若。', fortune: '平' },
    { n: 21, up: 'li',   low: 'zhen', name: '火雷噬嗑', short: '噬嗑', duan: '亨。利用狱。', fortune: '平' },
    { n: 22, up: 'gen',  low: 'li',   name: '山火贲',   short: '贲',  duan: '亨。小利有攸往。', fortune: '平' },
    { n: 23, up: 'gen',  low: 'kun',  name: '山地剥',   short: '剥',  duan: '不利有攸往。', fortune: '凶' },
    { n: 24, up: 'kun',  low: 'zhen', name: '地雷复',   short: '复',  duan: '亨。出入无疾，朋来无咎。反复其道，七日来复。利有攸往。', fortune: '吉' },
    { n: 25, up: 'qian', low: 'zhen', name: '天雷无妄', short: '无妄', duan: '元亨利贞。其匪正有眚，不利有攸往。', fortune: '平' },
    { n: 26, up: 'gen',  low: 'qian', name: '山天大畜', short: '大畜', duan: '利贞。不家食吉，利涉大川。', fortune: '吉' },
    { n: 27, up: 'gen',  low: 'zhen', name: '山雷颐',   short: '颐',  duan: '贞吉。观颐，自求口实。', fortune: '平' },
    { n: 28, up: 'dui',  low: 'xun',  name: '泽风大过', short: '大过', duan: '栋桡，利有攸往，亨。', fortune: '凶' },
    { n: 29, up: 'kan',  low: 'kan',  name: '坎为水',   short: '坎',  duan: '习坎，有孚，维心亨，行有尚。', fortune: '凶' },
    { n: 30, up: 'li',   low: 'li',   name: '离为火',   short: '离',  duan: '利贞，亨。畜牝牛吉。', fortune: '平' },
    { n: 31, up: 'dui',  low: 'gen',  name: '泽山咸',   short: '咸',  duan: '亨，利贞。取女吉。', fortune: '吉' },
    { n: 32, up: 'zhen', low: 'xun',  name: '雷风恒',   short: '恒',  duan: '亨，无咎，利贞，利有攸往。', fortune: '吉' },
    { n: 33, up: 'qian', low: 'gen',  name: '天山遁',   short: '遁',  duan: '亨，小利贞。', fortune: '平' },
    { n: 34, up: 'zhen', low: 'qian', name: '雷天大壮', short: '大壮', duan: '利贞。', fortune: '吉' },
    { n: 35, up: 'li',   low: 'kun',  name: '火地晋',   short: '晋',  duan: '康侯用锡马蕃庶，昼日三接。', fortune: '吉' },
    { n: 36, up: 'kun',  low: 'li',   name: '地火明夷', short: '明夷', duan: '利艰贞。', fortune: '凶' },
    { n: 37, up: 'xun',  low: 'li',   name: '风火家人', short: '家人', duan: '利女贞。', fortune: '吉' },
    { n: 38, up: 'li',   low: 'dui',  name: '火泽睽',   short: '睽',  duan: '小事吉。', fortune: '凶' },
    { n: 39, up: 'kan',  low: 'gen',  name: '水山蹇',   short: '蹇',  duan: '利西南，不利东北。利见大人，贞吉。', fortune: '凶' },
    { n: 40, up: 'zhen', low: 'kan',  name: '雷水解',   short: '解',  duan: '利西南。无所往，其来复吉。有攸往，夙吉。', fortune: '吉' },
    { n: 41, up: 'gen',  low: 'dui',  name: '山泽损',   short: '损',  duan: '有孚，元吉，无咎，可贞。利有攸往。', fortune: '平' },
    { n: 42, up: 'xun',  low: 'zhen', name: '风雷益',   short: '益',  duan: '利有攸往，利涉大川。', fortune: '吉' },
    { n: 43, up: 'dui',  low: 'qian', name: '泽天夬',   short: '夬',  duan: '扬于王庭，孚号有厉。告自邑，不利即戎，利有攸往。', fortune: '平' },
    { n: 44, up: 'qian', low: 'xun',  name: '天风姤',   short: '姤',  duan: '女壮，勿用取女。', fortune: '凶' },
    { n: 45, up: 'dui',  low: 'kun',  name: '泽地萃',   short: '萃',  duan: '亨，王假有庙。利见大人，亨，利贞。', fortune: '吉' },
    { n: 46, up: 'kun',  low: 'xun',  name: '地风升',   short: '升',  duan: '元亨，用见大人，勿恤，南征吉。', fortune: '吉' },
    { n: 47, up: 'dui',  low: 'kan',  name: '泽水困',   short: '困',  duan: '亨，贞，大人吉，无咎。有言不信。', fortune: '凶' },
    { n: 48, up: 'kan',  low: 'xun',  name: '水风井',   short: '井',  duan: '改邑不改井，无丧无得，往来井井。汔至亦未繘井，羸其瓶，凶。', fortune: '平' },
    { n: 49, up: 'dui',  low: 'li',   name: '泽火革',   short: '革',  duan: '己日乃孚，元亨利贞，悔亡。', fortune: '平' },
    { n: 50, up: 'li',   low: 'xun',  name: '火风鼎',   short: '鼎',  duan: '元吉，亨。', fortune: '吉' },
    { n: 51, up: 'zhen', low: 'zhen', name: '震为雷',   short: '震',  duan: '亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。', fortune: '平' },
    { n: 52, up: 'gen',  low: 'gen',  name: '艮为山',   short: '艮',  duan: '艮其背，不获其身，行其庭，不见其人，无咎。', fortune: '平' },
    { n: 53, up: 'xun',  low: 'gen',  name: '风山渐',   short: '渐',  duan: '女归吉，利贞。', fortune: '吉' },
    { n: 54, up: 'zhen', low: 'dui',  name: '雷泽归妹', short: '归妹', duan: '征凶，无攸利。', fortune: '凶' },
    { n: 55, up: 'zhen', low: 'li',   name: '雷火丰',   short: '丰',  duan: '亨，王假之，勿忧，宜日中。', fortune: '吉' },
    { n: 56, up: 'li',   low: 'gen',  name: '火山旅',   short: '旅',  duan: '小亨，旅贞吉。', fortune: '平' },
    { n: 57, up: 'xun',  low: 'xun',  name: '巽为风',   short: '巽',  duan: '小亨，利有攸往，利见大人。', fortune: '平' },
    { n: 58, up: 'dui',  low: 'dui',  name: '兑为泽',   short: '兑',  duan: '亨，利贞。', fortune: '吉' },
    { n: 59, up: 'xun',  low: 'kan',  name: '风水涣',   short: '涣',  duan: '亨。王假有庙，利涉大川，利贞。', fortune: '平' },
    { n: 60, up: 'kan',  low: 'dui',  name: '水泽节',   short: '节',  duan: '亨。苦节不可贞。', fortune: '平' },
    { n: 61, up: 'xun',  low: 'dui',  name: '风泽中孚', short: '中孚', duan: '豚鱼吉，利涉大川，利贞。', fortune: '吉' },
    { n: 62, up: 'zhen', low: 'gen',  name: '雷山小过', short: '小过', duan: '亨，利贞。可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。', fortune: '平' },
    { n: 63, up: 'kan',  low: 'li',   name: '水火既济', short: '既济', duan: '亨小，利贞。初吉终乱。', fortune: '平' },
    { n: 64, up: 'li',   low: 'kan',  name: '火水未济', short: '未济', duan: '亨。小狐汔济，濡其尾，无攸利。', fortune: '平' }
  ];

  // (上卦, 下卦) → 卦
  var HEX_INDEX = {};
  HEXAGRAMS.forEach(function (h) { HEX_INDEX[h.up + '|' + h.low] = h; });

  global.MeihuaData = {
    trigrams: TRIGRAMS,
    byNum: BY_NUM,
    byKey: BY_KEY,
    hexagrams: HEXAGRAMS,
    hexIndex: HEX_INDEX,
    // 五行生克
    wuxing: {
      sheng: { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' },
      ke:    { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' }
    }
  };

})(window);

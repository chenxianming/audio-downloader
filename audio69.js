
const request = require('request'),
      Async = require('async'),
      cheerio = require('cheerio'),
      fs = require('fs'),
      net = require('net'),
      program = require('commander'),
      progress = require('request-progress');


program.option('-d, --download [value]', 'Download path').option('-s, --startindex [value]', 'Download start index').option('-c --concurrency [value]','Comcurrency limit').option('-a --agent [value]','Visit agent').parse(process.argv);

if(!program.download || (program.download && typeof(program.download) != 'string') ){
	return program.help();
}

const list = program.download;
let title = '',
    proxy = '',
    proxies = [];

const customHeaders = {
        Accept:'*/*',
        'Accept-Encoding': 'identity;q=1, *;q=0',
        'Accept-Language': 'en-US,en;q=0.9',
        Range: 'bytes=0-',
        Referer: list,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1'
},ua = customHeaders['User-Agent'];

const checkPort = (port) => new Promise( (resolve) => {
	let server = net.createServer().listen(port);

	server.on('listening',() => {
		server.close();
		resolve(false);
	});

        server.on('error',() => {
                resolve(true);
        });

} )


const checkUrl = (ip,url) => new Promise( (resolve) => {
	
	request({
		url:url,
		method:'get',
		timeout:3000,
		headers:{
			'user-agent':ua
		},
		proxy:ip
	},(err,data) => {
		if(err){
			return resolve( false );
		}

		if( !data.body.match(new RegExp(program.agent,'i') ) ){
			return resolve( false );
		}

		return resolve( true );

	});

} );

const fetchProxy = () => new Promise( (resolve) => {
        let pages = '1'.split(''),
            pro = [];

	Async.eachLimit(pages,1,(item,callback) => {

                request({
                        url:`http://www.xicidaili.com/nn/${item}`,
                        method:'get',
                        timeout:6000
                },(err,data) => {
                        if(err){
                                return callback();
                        }

                        let $ = cheerio.load(data.body);

                        $('#ip_list tr').each(function(idx){
                                if(idx!=0){
                                        pro.push(`http://${$(this).find('td').eq(1).text()}:${$(this).find('td').eq(2).text()}`);
                                }
                        });

                        callback();

                });
	

	},() => {
		
		let np = pro.sort( (a,b) => Math.random() > .5 ? true : false );	

		proxies = np;

		resolve();
	});

} );

const getProxy = (url) => new Promise( (resolve) => {
	console.log('正在获取代理');

	let result = '';

        let np = proxies.sort( (a,b) => Math.random() > .5 ? true : false );//random ip list

	proxies = np.sort( (a,b) => Math.random() > .5 ? true : false );
	np = proxies.sort( (a,b) => Math.random() > .5 ? true : false );	

	Async.eachLimit(np,5,(ip,callback) => {
	
		const fn = async () => {
			if(result){
				return setTimeout(callback,200);
			}
		
			let matchArr = ip.split(':'),
			    port = matchArr[2] || 80;

			let checkPortRS = await checkPort(port);

			if(!checkPortRS){
				let checkUrlRS = await checkUrl( ip,list );
				if( checkUrlRS ){
					result = ip;
				}
			}
		
			setTimeout(callback,200);
		}
		
		fn();	

	},() => {
		resolve(result);
	});

} );

const getList = (url) => new Promise( (resolve) => {
	request({
		url:url,
		method:'get',
		timeout:6000,
		headers:{'user-agent':ua}
	},(err,data) => {
		if(err){
			return resolve(null);
		}

		let $ = cheerio.load( data.body );
		title = $('.binfo h1').text();

		let lists = [];

		$('.plist a').each(function(idx){
			lists.push({
				index:idx,
				name:$(this).html() * 1,
				url:$(this).attr('href')
			});
		});

		resolve( lists );
	});
} );

const getUrl = (url) => new Promise( (resolve) => {
	request({
		url:url,
		method:'get',
		timeout:6000,
		headers:{'user-agent':ua}
	},(err,data) => {
		if(err){
			return resolve(null);
		}
		let $ = cheerio.load( data.body );
		resolve( $('source').attr('src') );
	});
} );

const checkFile = (title,name) => new Promise( (resolve) => {
	if( fs.existsSync( `./files/${title}/${name}.m4a` ) ){
		if( fs.statSync( `./files/${title}/${name}.m4a` ).size > 21520 ){
			console.log(`file exist skip this chapter`);
			return resolve( true );
		}
	}
	
	resolve(false);

} );

const fetchAudio = (url,referer,proxyIp,name,index,total) => new Promise( (resolve) => {
	let hd = Object.assign({},customHeaders);
	hd['Referer'] = referer;
        hd['Host'] = url.match(/\/\/(.*)\.com/)[0].replace('//','');	

	progress( request({
		url:url,
		method:'get',
		timeout:6000,
		headers:hd,
		proxy:proxyIp,
		maxRedirects: 10,
		followRedirect: true,
		followOriginalHttpMethod:true
	}) ).on('progress',(st) => {

		try{

			let per = ~~( st.percent * 10 ),
			    chunk = '';


			for(let i=0;i<per;i++){
				chunk += '=';
			}

			chunk += '>';

			for(let i=per;i<10;i++){
				chunk+=' ';
			}

			console.log(`downloading ${title}/${name} [${chunk}]${per*10}%`);

			console.log(`total:${st.time.elapsed.toFixed(2)}(s) remaining:${ st.time.remaining.toFixed(2) }(s)  speed:${ (st.speed/1024).toFixed(2) }(k/s) \n`);			

		}catch(e){}

	}).on('response',function(rsp){

		if(!rsp){
			console.log(`get ${item.name} faild. skip to next chapter #1`);
                        return resolve(false);
		}

		let contentType = rsp.headers['content-type'];
		
		if(!contentType.match(/audio/i)){
			console.log(`get ${name} faild. skip to next chapter #2`);
			console.log( contentType );
			return resolve(false);
		}

		console.log(`downloading ====> title:${name} size:${rsp.headers['content-length']} index:${index} total:${total}`);

	}).on('error',(err) => {
		console.log( err );
		console.log(`get ${name} faild. skip to next chapter #3`);
                resolve(false);
	}).on('end',() => {
		console.log(`download ${title} chapter ${name} was completed index:${index} total:${total}`);

		resolve(true);

	}).pipe( fs.createWriteStream(`./files/${title}/${name}.m4a`) );

} );


const download = (lists,startIdx,thread) => new Promise( (resolve) => {
	let si = startIdx || 0;
	let con = thread || 1; //site limit
	
	let task = [];
	
	for(let j = si;j<lists.length-1;j++){
		task.push( lists[j] );
	}

	console.log(`${title} startindex:${startIdx} count:${task.length}`);

        Async.eachLimit(task,con,(item,callback) => {

		const run = async () => {

			let audioUrl = await getUrl(item.url);

                	if( !fs.existsSync(`./files/${title}/`) ){
                        	fs.mkdirSync(`./files/${title}/`);
                	}		
			
			if( await checkFile(title,item.name) ){
				return callback();
			}
			
			proxy = await getProxy(list) || '';
                        console.log(`使?~T?代?~P~F?~\~M?~J??~Y? ${ proxy }`);

			await fetchAudio( audioUrl,item.url,proxy,item.name,item.index,task.length );
			callback();	
			//setTimeout(callback,3 * 60 * 1000);
		}

		return run();	
		
        },() => {
		resolve( `task was completed. files save as ==> ./files/${title}/` );
	});


} );

const f = async () => {
	await fetchProxy();

	let lists = ( await getList(list) );	
	let st = isNaN(program.startindex) ? 0 : program.startindex,
	    con = isNaN(program.concurrency) ? 0 : program.concurrency;

	console.log( await download(lists,st,con) );

}

f();

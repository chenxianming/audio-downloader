
const request = require('request'),
      Async = require('async'),
      cheerio = require('cheerio'),
      fs = require('fs'),
      net = require('net'),
      program = require('commander'),
      progress = require('request-progress');


program.option('-d, --download [value]', 'Download path').option('-s, --startindex [value]', 'Download start index').option('-c --concurrency [value]','Comcurrency limit').option('-a --agent [value]','Visit agent').option('-p --proxy [value]','Get proxy list form').parse(process.argv);

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

} );


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

const trim = (text) => {
	let whitespace = '[\\x20\\t\\r\\n\\f]';
	return text == null ? '' : (text + '').replace( new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),'' );
}

const fetchProxy = (site) => new Promise( (resolve) => {
	let sitePro = site || 'xici';

	let urlstr = '1';

	switch(sitePro){
		case '89ip':
			{
				urlstr = '12345';
			}
		break ;

		case 'ip3366':
			{
				urlstr = '123456';
			}
		break ;
	}

        let pages = urlstr.split(''),
	    fetchList = [],
            pro = [];

	switch(sitePro){
		case 'xici':
			{
				pages.forEach( (p) => {
					fetchList.push(`http://www.xicidaili.com/nn/${ p }`);
				} );
			}
		break ;

		case '89ip':
			{
				pages.forEach( (p) => {
					fetchList.push(`http://www.89ip.cn/index_${p}.html`);
				} );
			}
		break ;

		case '66ip':
			{
				fetchList.push('http://www.66ip.cn/mo.php?sxb=&tqsl=200&port=&export=&ktip=&sxa=&submit=%CC%E1++%C8%A1&textarea=http%3A%2F%2Fwww.66ip.cn%2F%3Fsxb%3D%26tqsl%3D200%26ports%255B%255D2%3D%26ktip%3D%26sxa%3D%26radio%3Dradio%26submit%3D%25CC%25E1%2B%2B%25C8%25A1');
			}
		break ;

		case 'ip3366':
			{
				pages.forEach( (p) => {
					fetchList.push(`http://www.ip3366.net/?page=${p}`);
				} );
			}
		break ;
	}

	Async.eachLimit(fetchList,1,(item,callback) => {
                request({
			url:item,
                        method:'get',
                        timeout:6000,
			headers:{
				'user-agent':ua
			}
                },(err,data) => {

                        if(err){
                                return callback();
                        }

                        let $ = cheerio.load(data.body);

			switch(sitePro){
				case 'xici' :
					{
                                                $('#ip_list tr').each(function(idx){
                                                        if(idx!=0){
								pro.push(`http://${$(this).find('td').eq(1).text()}:${$(this).find('td').eq(2).text()}`);
                                                        }
                                                });

					}
				break ;
			
				case '89ip' :
					{
			
						$('.layui-table tbody tr').each(function(){
							pro.push(`http://${ trim( $(this).find('td').eq(0).text() )}:${ trim( $(this).find('td').eq(1).text() ) }`);
						});
					}
				break ;

				case '66ip' :
					{
						let vArr = $('body').html().split('<br>');

						vArr.forEach( (v) => {
							if(v.length<25){
								pro.push(`http://${ trim(v) }`);
							}
						} );
					}
				break ;

				case 'ip3366' :
					{
						$('#list tr').each(function(){
							pro.push(`http://${ trim( $(this).find('td').eq(0).text() )}:${ trim( $(this).find('td').eq(1).text() ) }`);
						});
					}
				break ;
			}

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
	await fetchProxy(program.proxy);

	let lists = ( await getList(list) );	
	let st = isNaN(program.startindex) ? 0 : program.startindex,
	    con = isNaN(program.concurrency) ? 0 : program.concurrency;

	console.log( await download(lists,st,con) );

}

f();

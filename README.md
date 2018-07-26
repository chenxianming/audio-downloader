# -
某网站有声书下载器(仅在特殊网站可使用)

>*该项目仅供学习交流,如侵犯到您的权益请及时与我们联系
>vps上的vim进行编写,大神勿喷
>该网站有防盗链机制,国外vps无法获取代理列表,因此最好在国内vps上运行

##安装

    git clone https://github.com/chenxianming/audio-downloader.git
    npm install
    
##使用

    node audio69.js -d http://m.audio69.com/book/28.html -a audio69
    
##参数说明

    -d Url (必填,下载链接,仅针对手机版,必须用手机版url)
    -a Agent (选填,最好是填,用于测试代理服务器是否可用,该网站有防盗链机制)
    -c Concurrency (选填,同时队列并发,默认值为1)
    -s Startindex (选填,从第几集开始下载,默认值为0)





(1.)获取内容列表<br />
(2.)获取最新代理服务器<br />
(3.)检查文件是否存在<br />
(4.)获取下载链接<br />
(5.)查询代理端口是否被占用及测试代理服务器是否可用<br />
(6.)下载文件跳转至下一队列

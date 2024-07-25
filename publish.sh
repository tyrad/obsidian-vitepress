#!/bin/bash
# 1.需要本机和远程服务器都安装了 rsync
# 2.本地环境变量设置好远程服务器对应ssh端口、web目录
#rsync -avz -e "ssh -p $BLOG_SERVER_PORT" dist/* root@$BLOG_SERVER_ADDRESS:$BLOG_REMOTE_FOLDER
# use pem, eg:
rsync -avz -e "ssh -i '$BLOG_REMOTE_CONNECT_PEM' -p $BLOG_SERVER_PORT" dist/* root@$BLOG_SERVER_ADDRESS:$BLOG_REMOTE_FOLDER

@chcp 936
@echo off
setlocal
if not defined registry set registry=http://registry.npm.taobao.org

call npm install less@latest --registry=%registry%
if not exist node_modules/less goto :error1

set coms_path=node_modules\less\lib,node_modules
set public_path=process\less
set page=./
set app=/less-node/index.js
set destpath=process\less\less-node.js
git restore %destpath%
call efront publish
if not exist %public_path%\lessNode goto :error2
echo ;>>%public_path%\lessNode
echo module.exports=this.lessNode.default;>>%public_path%\lessNode
if exist %destpath%  del %destpath%
move %public_path%\lessNode %destpath%
node %destpath%
if errorlevel == 1 goto :recover
goto :end

:error1
echo 安装失败
goto :end
:error2
echo 编译失败
goto :end
:recover
echo 编译代码无法执行，下次启动前请还原
goto :end


:end
call npm uninstall less
if exist package-lock.json del package-lock.json
endlocal
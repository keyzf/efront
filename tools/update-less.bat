@chcp 936
@echo off
setlocal
if not defined registry set registry=http://registry.npm.taobao.org

call npm install less@latest --registry=%registry%
if not exist node_modules/less goto :error1

set coms_path=node_modules\less\lib,node_modules,coms\typescript
set public_path=coms\less-node
set page=./
set app=/less-node/index.js
set destpath=%public_path%\index.js
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
echo ��װʧ��
goto :end
:error2
echo ����ʧ��
goto :end
:recover
echo ��������޷�ִ�У��´�����ǰ�뻹ԭ
goto :end


:end
call npm uninstall less
if exist package-lock.json del package-lock.json
endlocal
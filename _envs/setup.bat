REM ���ı���gb2312
rem Ĭ��Ӧ��
if not defined app set APP=zimoli
set AAPI=zimoli
set ICON=zimoli
set COMM=zimoli
rem database
set DB_HOST=localhost
set DB_PORT=3306
set DB_USERNAME=root
set DB_PASSWORD=root
set DB_DATABASE=%APP%
SET HOST.QINIU=ouxjfkv92.bkt.clouddn.com
rem https֤��·��
set PATH.SSL_PFX=%~DP0cert\efront.cc.pfx
rem ������ֵд��.\cert\private.bat ����ֹ�ύ
REM set PASSWORD.SSL_PFX=%ssl֤������%
REM set KEY.AMAP=%�ߵµ�ͼkey%
REM set KEY.QINIU_ACCESS=%��ţ��access%
REM set KEY.QINIU_SECRET=%��ţ��secret%
REM set KEY.REQUEST_SECRET=%efrontͨ����Կ%
@if exist "%~dp0cert\private.bat" @call "%~dp0cert\private"

rem ǰ�������õ����в������� app=%app%.bat ��д
@for %%i in (%app%) do @call "%~DP0app=%%i"

rem Ӧ�÷���·��
set PUBLIC_PATH="%~DP0..\public"
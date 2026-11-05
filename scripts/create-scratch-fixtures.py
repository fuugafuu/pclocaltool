import json,zipfile,zlib,struct,hashlib,io,wave,math
from pathlib import Path
out=Path('output/scratch-test');out.mkdir(exist_ok=True)
def png(i,w=64,h=64):
 def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
 raw=b''.join(b'\0'+bytes([(i*37)%255,(i*67)%255,(i*97)%255,255])*w for _ in range(h))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
assets={};costumes=[];sounds=[]
for i in range(40):
 b=png(i);a=hashlib.md5(b).hexdigest();assets[a+'.png']=b;costumes.append({'assetId':a,'name':'image'+str(i),'bitmapResolution':2,'md5ext':a+'.png','dataFormat':'png','rotationCenterX':32,'rotationCenterY':32})
for i in range(4):
 buf=io.BytesIO()
 with wave.open(buf,'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(22050);w.writeframes(b''.join(struct.pack('<h',int(math.sin(n*(i+1)*.1)*3000)) for n in range(2205)))
 b=buf.getvalue();a=hashlib.md5(b).hexdigest();assets[a+'.wav']=b;sounds.append({'assetId':a,'name':'tone'+str(i),'md5ext':a+'.wav','dataFormat':'wav','format':'','rate':22050,'sampleCount':2205})
stage={'isStage':True,'name':'Stage','variables':{},'lists':{},'broadcasts':{},'blocks':{},'comments':{},'currentCostume':0,'costumes':costumes[:1],'sounds':[],'volume':100,'layerOrder':0,'tempo':60,'videoTransparency':50,'videoState':'on','textToSpeechLanguage':None}
sprite={'isStage':False,'name':'Sprite','variables':{},'lists':{},'broadcasts':{},'blocks':{},'comments':{},'currentCostume':0,'costumes':costumes*3,'sounds':sounds,'volume':100,'visible':True,'x':0,'y':0,'size':100,'direction':90,'draggable':False,'rotationStyle':'all around','layerOrder':1}
sprite['currentCostume']=1
sprite['blocks']={'hat':{'opcode':'event_whenflagclicked','next':'move','parent':None,'inputs':{},'fields':{},'shadow':False,'topLevel':True,'x':0,'y':0},'move':{'opcode':'motion_changexby','next':None,'parent':'hat','inputs':{'DX':[1,[4,'10']]},'fields':{},'shadow':False,'topLevel':False}}
project={'targets':[stage,sprite],'monitors':[],'extensions':[],'meta':{'semver':'3.0.0','vm':'0.2.0','agent':'Scratch Lite fixture'}}
(out/'assets').mkdir(exist_ok=True)
for name,data in assets.items():(out/'assets'/name).write_bytes(data)
(out/'fixture.json').write_text(json.dumps(project),encoding='utf-8')
with zipfile.ZipFile(out/'fixture.sb3','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('project.json',json.dumps(project))
 for name,b in assets.items():z.writestr(name,b)
backdrop=png(0);backdrop_id=hashlib.md5(backdrop).hexdigest()
legacy={'objName':'Stage','variables':[],'lists':[],'scripts':[],'sounds':[],'costumes':[{'costumeName':'backdrop1','baseLayerID':0,'baseLayerMD5':backdrop_id+'.png','bitmapResolution':2,'rotationCenterX':32,'rotationCenterY':32}],'currentCostumeIndex':0,'children':[],'info':{}}
with zipfile.ZipFile(out/'legacy.sb2','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('project.json',json.dumps(legacy));z.writestr('0.png',backdrop)
with zipfile.ZipFile(out/'missing.sb3','w',zipfile.ZIP_DEFLATED) as z:z.writestr('project.json',json.dumps(project))
print('Created fixtures:',len(assets),'unique assets /',len(sprite['costumes'])+1,'costume references')

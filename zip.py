# this script zips all for the extension importend files
import os, re, zipfile

files_and_folders = ["service-worker.js", "manifest.json", "icons", "popup", "_locales"]
cwd = os.path.dirname(__file__)
export_path = os.path.join(cwd, "export")
if not os.path.isdir(export_path):
    os.mkdir(export_path)

def create_path_list(files_and_folders):
    files_and_folders = [os.path.join(cwd, entity) for entity in files_and_folders]

    paths = []
    for path in files_and_folders:
        if os.path.isdir(path):
            for dirpath, subdirs, subfiles in os.walk(path):
                if subdirs == [] and subfiles == []:
                    paths.append(dirpath) # if folder is empty 
                paths += [os.path.join(dirpath, subfile) for subfile in subfiles]
            continue
        paths.append(path)
    return paths

paths = create_path_list(files_and_folders)
print(paths)


def get_name(path):
    versions = []
    n = 4
    pattern = r'v(\d+)' + r'\.(\d+)' * (n - 1) + '.zip'
    for files in os.listdir(path):
        match = re.match(pattern, files)
        if match:
            version = list(map(int, match.groups()))
            versions.append(version)
    
    last_version = [0] * n
    for version in versions:
        for i in range(n):
            if version[i] > last_version[i]:
                last_version = version
                break
            if last_version[i] > version[i]:
                break
    
    last_version[-1] += 1
    return ('v{}'+ '.{}' * (n - 1) + '.zip').format(*last_version)

name = get_name(export_path)
print(name)

with zipfile.ZipFile(os.path.join(export_path, name), "w") as zipf:
    for path in paths:
        zipf.write(path, arcname=os.path.relpath(path, start=cwd))
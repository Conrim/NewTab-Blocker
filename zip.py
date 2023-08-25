# this script zips the extension folder
import os, re, zipfile

def create_path_list(folder):
    """creates a list of full paths of files and folders that shall be zipped"""
    paths = []
    for dirpath, subdirs, subfiles in os.walk(folder):
        if subdirs == [] and subfiles == []:
            # if folder is empty 
            paths.append(dirpath)
        paths += [os.path.join(dirpath, subfile) for subfile in subfiles]
    return paths

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

cwd = os.path.dirname(__file__)
extension_path = os.path.join(cwd, "extension")
paths = create_path_list(extension_path)

export_folder = os.path.join(cwd, "export")
if not os.path.isdir(export_folder):
    # create folder if necessary
    os.mkdir(export_folder)
export_path = os.path.join(export_folder, get_name(export_folder))



print(f"extension path: {extension_path}")
print(f"export path: {export_path}")
print("files and folders list: ", *paths, sep="\n\t- ")

with zipfile.ZipFile(export_path, "w") as zipf:
    for path in paths:
        zipf.write(path, arcname=os.path.relpath(path, start=extension_path))
print("finished")
input("press enter to continue")
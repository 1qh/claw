/*
 * tigerfs-rename-shim.c
 *
 * LD_PRELOAD shim that fixes TigerFS's missing support for rename()
 * over an existing target. POSIX requires rename(2) to atomically
 * replace the target if it exists. TigerFS returns EIO instead.
 *
 * Fix: if rename() fails with EIO and the target exists, unlink the
 * target first, then retry the rename.
 *
 * Build:  gcc -shared -fPIC -o tigerfs-rename-shim.so tigerfs-rename-shim.c -ldl
 * Usage:  LD_PRELOAD=/path/to/tigerfs-rename-shim.so openclaw gateway
 */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <stdio.h>
#include <unistd.h>

typedef int (*rename_fn)(const char *, const char *);

int rename(const char *oldpath, const char *newpath) {
    static rename_fn real_rename = NULL;
    if (!real_rename)
        real_rename = (rename_fn)dlsym(RTLD_NEXT, "rename");

    int ret = real_rename(oldpath, newpath);
    if (ret == -1 && errno == EIO && access(newpath, F_OK) == 0) {
        unlink(newpath);
        ret = real_rename(oldpath, newpath);
    }
    return ret;
}

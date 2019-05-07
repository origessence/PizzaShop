import errno
import portalocker
import logging
import os

from certbot import errors


logger = logging.getLogger(__name__)

def lock_dir(dir_path):

    return LockFile(os.path.join(dir_path, '.certbot.lock'))


class LockFile(object):

    def __init__(self, path):

        super(LockFile, self).__init__()
        self._path = path
        self._file = None

        self.acquire()

    def acquire(self):
         while self._file is None:
            # Open the file
            file = open(self._path, 'a+')
            try:
                self._try_lock(file)
                if self._lock_success(file):
                    self._file = file
            finally:
                # Close the file if it is not the required one
                if self._file is None:
                    os.close(file)

    def _try_lock(self, file):
        try:
            portalocker.lock(file, portalocker.LOCK_EX | portalocker.LOCK_NB)
        except IOError as err:
            if err.errno in (errno.EACCES, errno.EAGAIN):
                logger.debug(self._path)
                raise errors.LockError()
            raise

    def _lock_success(self, file):
        try:
            stat1 = os.stat(self._path)
        except OSError as err:
            if err.errno == errno.ENOENT:
                return False
            raise

        stat2 = os.stat(file.name)
        return stat1.st_dev == stat2.st_dev and stat1.st_ino == stat2.st_ino



    def __repr__(self):
        repr_str = '{0}({1}) <'.format(self.__class__.__name__, self._path)
        if self._file is None:
            repr_str += 'released>'
        else:
            repr_str += 'acquired>'
        return repr_str

    def release(self):
        try:
            self._file.close()
            os.remove(self._path)
        finally:
            try:
                self._file.close()
            finally:
                self._file = None

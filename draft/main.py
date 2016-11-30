import os
import sys
import pandas as pd


if __name__ == '__main__':

    print 'Reading player stats...'

    stats = pd.DataFrame.from_csv('./stats_2015.csv')
    


import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import UserUtils from '../../utils/user_utils.js';

const ArticleViewerLegend = ({ article, users, colors, status, allUsers, failureMessage, refData }) => {
  let userLinks;
  let j = 0;
  function scroll(id) {
    console.log(refData);
    // refData[id][j].current.scrollIntoView();
    // window.scrollTo(0, refData[id][j]);
    j += 1;
  }
  if (users) {
    // ADD BUTTON FOR USERS WITH HIGHLIGHTING
    // ONLICK FUNCTION SCROLLS TO NEXT SCROLL OBJECT
    userLinks = users.map((user, i) => {
      let res;
      const userLink = UserUtils.userTalkUrl(user.name, article.language, article.project);
      const fullUserRecord = allUsers.find(_user => _user.username === user.name);
      const realName = fullUserRecord && fullUserRecord.real_name;

      if (user.activeRevision === true) {
        res = <div key={`legend-${user.name}`} className={`user-legend ${colors[i]}`}><a href={userLink} title={realName} target="_blank">{user.name}</a><button onClick={() => scroll(user.userid)}>SCROLL</button></div>;
      } else {
        res = <div key={`legend-${user.name}`} className={'user-legend tooltip-trigger'}><p className={'tooltip dark large'}>{I18n.t('users.no_highlighting')}</p><a href={userLink} title={realName} target="_blank">{user.name}</a></div>;
      }

      return res;
    });
  } else {
    userLinks = <div className="user-legend authorship-loading"> &nbsp; &nbsp; </div>;
  }

  let usersStatus;
  if (status === 'loading') {
    usersStatus = (
      <div>
        <div className="user-legend authorship-loading"> &nbsp; &nbsp; </div>
        <div className="user-legend authorship-status">{I18n.t('users.loading_authorship_data')}</div>
        <div className="user-legend authorship-loading"> &nbsp; &nbsp; </div>
      </div>
    );
  } else if (status === 'failed') {
    usersStatus = <div className="user-legend authorship-status-failed">{I18n.t('users.authorship_data_not_fetched')}: {failureMessage}</div>;
  }

  return (
    <div className="user-legend-wrap">
      <div className="user-legend">{I18n.t('users.edits_by')} </div>
      {userLinks}
      {usersStatus}
    </div>
  );
};

ArticleViewerLegend.propTypes = {
  article: PropTypes.object,
  users: PropTypes.array,
  colors: PropTypes.array,
  status: PropTypes.string
};

const mapStateToProps = state => ({
  allUsers: state.users.users
});

export default connect(mapStateToProps)(ArticleViewerLegend);
